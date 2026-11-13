"""Telegram update router: update → Event → pure flow → replies + side effects.

Idempotent by update_id. Unlinked chats never receive anything about a mother, and a chat
can only act on tickets of the mother it is linked to.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlmodel import Session

from app.core.time import ist_today
from app.db.models import ProcessedInteraction, TelegramLink, TelegramSession
from app.domain import messages
from app.domain.telegram_flows import Effect, Event, Reply, step
from app.integrations.registry import get_integrations
from app.repositories import mothers as mrepo
from app.services import telegram_alerts, telegram_onboarding
from app.services import telegram_send as tg

logger = logging.getLogger(__name__)
TICKET_ACTIONS = ("ack:", "reached:")


def active_link(s: Session, chat_id: str) -> TelegramLink | None:
    link = s.get(TelegramLink, chat_id)
    return link if link and link.active else None


def to_event(update: dict[str, Any], now: datetime) -> tuple[str, str, Event, str | None] | None:
    """(chat_id, tg_user_id, event, callback_id) or None for updates we ignore."""
    today = ist_today(now)
    if cq := update.get("callback_query"):
        chat = ((cq.get("message") or {}).get("chat") or {}).get("id")
        if chat is None:
            return None
        return (
            str(chat),
            str((cq.get("from") or {}).get("id", "")),
            Event("callback", text=str(cq.get("data", "")), today=today),
            str(cq.get("id", "")),
        )
    msg = update.get("message") or {}
    if not msg.get("chat"):
        return None
    chat_id, user_id = str(msg["chat"]["id"]), str((msg.get("from") or {}).get("id", ""))
    if contact := msg.get("contact"):
        own = str(contact.get("user_id", "")) == user_id
        ev = Event("contact", phone=str(contact.get("phone_number", "")), own_contact=own,
                   first_name=str(contact.get("first_name", "")), today=today)  # fmt: skip
    elif photos := msg.get("photo"):
        ev = Event("photo", file_id=str(photos[-1]["file_id"]), today=today)
    elif (doc := msg.get("document")) and str(doc.get("mime_type", "")).startswith("image/"):
        ev = Event("photo", file_id=str(doc["file_id"]), today=today)
    elif (text := str(msg.get("text") or "")).startswith("/"):
        ev = Event("command", text=text.split()[0].split("@")[0].lower(), today=today)
    else:
        ev = Event("text", text=text.strip(), today=today)
    return chat_id, user_id, ev, None


async def _send_replies(s: Session, chat_id: str, state: str, replies: list[Reply], now: datetime) -> None:
    link = active_link(s, chat_id)
    for r in replies:
        if link and link.mother_id and state.startswith("rx_"):
            await tg.send_logged(s, link, r.text, "prescription", now, buttons=r.buttons)
        else:
            await tg.raw_send(chat_id, r.text, r.buttons, r.request_contact)


async def _effect(s: Session, sess: TelegramSession, eff: Effect, user_id: str, now: datetime) -> Event | None:
    chat_id, today = sess.chat_id, ist_today(now)
    link = active_link(s, chat_id)
    if eff.kind == "lookup":
        result = telegram_onboarding.lookup_and_link(s, chat_id, user_id, eff.payload["phone"], now)
        return Event("lookup", result=result, today=today)
    if eff.kind == "read_slip":
        result = await telegram_onboarding.read_document(s, eff.payload["file_id"], sess.data["mother_phone"], now)
        return Event("slip", result=result, today=today)
    if eff.kind == "save_onboarding":
        mother = await telegram_onboarding.save_onboarding(s, chat_id, user_id, eff.payload, now)
        sess.state, sess.data = "linked", {}
        s.commit()
        link = active_link(s, chat_id)
        if link:
            text = messages.render("WELCOME", mother.language, **telegram_onboarding.welcome_values(s, mother))
            await tg.send_logged(s, link, text, "welcome", now)
        return None
    if link is not None and link.role == "asha" and not link.mother_id:
        if eff.kind == "status":
            await tg.raw_send(chat_id, telegram_alerts.asha_status(s, link.phone, now))
        elif eff.kind in ("read_rx", "save_rx"):
            await tg.raw_send(chat_id, "Prescriptions are added from the mother's or family's Jodi chat.")
        elif eff.kind == "stop":
            link.active = False
            s.commit()
        return None
    if link is None or not link.mother_id:
        await tg.raw_send(chat_id, "Please send /start and share your phone number first.")
        return None
    mother = mrepo.get_mother(s, link.mother_id)
    if eff.kind == "status":
        await tg.raw_send(chat_id, telegram_alerts.status_summary(s, mother, now))
    elif eff.kind == "read_rx":
        result = await telegram_onboarding.read_document(s, eff.payload["file_id"], mother.phone, now)
        meds = (result.get("fields") or {}).get("medicines") or []
        return Event("rx", result={"medicines": meds}, today=today)
    elif eff.kind == "save_rx":
        telegram_onboarding.save_prescription(s, link, eff.payload.get("medicines", []), now)
    elif eff.kind == "stop":
        link.active = False
        s.commit()
    return None


def _session(s: Session, chat_id: str) -> TelegramSession:
    sess = s.get(TelegramSession, chat_id)
    if sess is None:
        sess = TelegramSession(chat_id=chat_id, state="new", data={})
        s.add(sess)
    if active_link(s, chat_id) and not (sess.state.startswith("linked") or sess.state.startswith("rx_")):
        sess.state, sess.data = "linked", {}
    return sess


async def run_event(s: Session, chat_id: str, user_id: str, event: Event, now: datetime) -> None:
    sess = _session(s, chat_id)
    queue = [event]
    while queue:
        ev = queue.pop(0)
        res = step(sess.state, sess.data, ev)
        sess.state, sess.data, sess.updated_at = res.state, res.data, now
        s.commit()
        await _send_replies(s, chat_id, res.state, res.replies, now)
        for eff in res.effects:
            if (follow := await _effect(s, sess, eff, user_id, now)) is not None:
                queue.append(follow)


async def _answer(callback_id: str | None, text: str) -> None:
    if not callback_id:
        return
    try:
        await get_integrations().telegram.answer_callback(callback_id, text)
    except Exception:
        logger.warning("telegram answer_callback failed")


async def handle_update(s: Session, update: dict[str, Any], now: datetime) -> None:
    """Process one Telegram update. Never raises (errors are logged)."""
    uid = update.get("update_id")
    key = f"tg_{uid}" if uid is not None else None
    if key and s.get(ProcessedInteraction, key):
        return
    if key:
        s.add(ProcessedInteraction(interaction_id=key, kind="telegram", created_at=now))
        s.commit()
    try:
        parsed = to_event(update, now)
        if parsed is None:
            return
        chat_id, user_id, event, cb_id = parsed
        if event.kind == "callback" and event.text.startswith(TICKET_ACTIONS):
            answer = await telegram_alerts.handle_ticket_callback(s, active_link(s, chat_id), event.text, now)
            await _answer(cb_id, answer)
            return
        await _answer(cb_id, "")
        await run_event(s, chat_id, user_id, event, now)
    except Exception:
        s.rollback()
        logger.exception("telegram update failed")

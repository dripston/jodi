"""Telegram alerts, reminders, green status and ticket buttons.

Voice stays primary: these run *after* the phone call / transfer / ASHA task in
ticket_service, and every failure is swallowed (logged) so tickets always proceed.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlmodel import Session

from app.core.errors import DomainError
from app.core.logging import log, mask_phone
from app.core.time import day_since_delivery, ist_today, to_ist
from app.db.models import Mother, TelegramLink, Ticket
from app.domain import facilities as fac
from app.domain import messages
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.services import telegram_send as tg

logger = logging.getLogger(__name__)


def _facility(s: Session, mother: Mother, subjects: list[str]) -> str:
    need = "emergency_mother" if "mother" in subjects or not subjects else "emergency_baby"
    infos = [fac.FacilityInfo(f.id, f.name, f.type, frozenset(f.services), f.lat, f.lng, f.cost_band, f.open_24x7)
             for f in mrepo.list_facilities(s)]  # fmt: skip
    ranked = fac.rank(infos, need, mother.lat, mother.lng) or fac.rank(infos, "emergency", mother.lat, mother.lng)
    return ranked[0][0].name if ranked else "the nearest government hospital"


def _day(mother: Mother, now: datetime) -> int | str:
    return day_since_delivery(mother.delivery_date, now) if mother.delivery_date else "?"


def next_call_text(s: Session, mother: Mother) -> str:
    pending = rrepo.pending_scheduled(s, mother.id)
    if not pending or pending[0].due_at is None:
        return "soon"
    local = to_ist(pending[0].due_at)
    day = f"day {pending[0].day}, " if pending[0].day is not None else ""
    return f"{day}{local.day} {local.strftime('%b')} around {local.strftime('%H:%M')}"


async def notify_ticket(s: Session, t: Ticket, mother: Mother, now: datetime, event: str = "open") -> int:
    """Alert all active family links + the mother's link. event: open | raised | reminder.

    Dedupe: one alert per ticket per level; one reminder per escalation step. Never raises.
    """
    if not tg.enabled():
        return 0
    try:
        values = {"name": mother.name, "day": _day(mother, now), "what": messages.plain_reason(t.reason_text),
                  "facility": _facility(s, mother, list(t.subjects))}  # fmt: skip
        if event == "reminder":
            text, key = (
                messages.reminder_text(t.level, mother.language, **values),
                f"reminder:{t.id}:{len(t.assigned_to)}",
            )
        else:
            text, key = (
                messages.alert_text(t.level, list(t.subjects), mother.language, **values),
                f"alert:{t.id}:{t.level}",
            )
        sent = 0
        for link in tg.active_links(s, mother.id):
            msg = await tg.send_logged(s, link, text, "alert", now, buttons=messages.ticket_buttons(t.id),
                                       ticket_id=t.id, dedupe_key=key)  # fmt: skip
            sent += bool(msg and msg.delivered)
        return sent
    except Exception:  # Telegram must never break the ticket flow
        logger.exception("telegram notify failed")
        return 0


async def notify_status_green(s: Session, mother: Mother, now: datetime) -> int:
    """After a green check-in: STATUS_GREEN to family links, at most once per day per mother."""
    if not tg.enabled():
        return 0
    try:
        text = messages.render("STATUS_GREEN", mother.language, name=mother.name, day=_day(mother, now),
                               next_call=next_call_text(s, mother))  # fmt: skip
        key = f"status:{mother.id}:{ist_today(now).isoformat()}"
        sent = 0
        for link in tg.active_links(s, mother.id, roles=("family",)):
            sent += bool(await tg.send_logged(s, link, text, "status", now, dedupe_key=key))
        return sent
    except Exception:
        logger.exception("telegram status failed")
        return 0


def status_summary(s: Session, mother: Mother, now: datetime) -> str:
    baby = mrepo.baby_of(s, mother.id)
    return messages.render(
        "STATUS_SUMMARY", mother.language, name=mother.name, day=_day(mother, now),
        mother_status=messages.LEVEL_WORDS.get(mother.status, mother.status),
        baby_status=messages.LEVEL_WORDS.get(baby.status if baby else "green", "green"),
        next_call=next_call_text(s, mother),
    )  # fmt: skip


async def handle_ticket_callback(s: Session, link: TelegramLink | None, data: str, now: datetime) -> str:
    """ack:<ticket_id> / reached:<ticket_id> from an alert button. Returns the answer text."""
    from app.services import ticket_service

    action, _, ticket_id = data.partition(":")
    if link is None or not link.active or not link.mother_id:
        return "This chat is not linked to Jodi."
    t = s.get(Ticket, ticket_id)
    if t is None or t.mother_id != link.mother_id:
        return "This alert is not for this chat."
    try:
        if action == "ack":
            if t.state not in ("open", "notified"):
                return "Already confirmed. Thank you."
            ticket_service.acknowledge(s, t.id, f"telegram:{mask_phone(link.phone)}", "confirmed on Telegram", now)
            answer = "Thank you. Jodi has noted that you are on it."
        else:
            ticket_service.mark_reached(s, t.id, "family:telegram", "family confirmed on Telegram", now)
            answer = "Thank you. Jodi has noted that she reached the hospital."
    except DomainError as exc:
        log(logger, "telegram ticket action refused", logging.INFO, ticket_id=t.id, error=exc.message)
        return "Already updated. Thank you."
    await tg.raw_send(link.chat_id, answer)
    return answer

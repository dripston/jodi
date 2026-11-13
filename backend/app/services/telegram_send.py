"""Safe Telegram sending: timeout + try/except, OutboundMessage log, dedupe. Never raises."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime

from sqlmodel import Session, col, select

from app.core.config import get_settings
from app.core.logging import log, redact_secrets
from app.db.models import Asha, FamilyContact, Mother, OutboundMessage, TelegramLink
from app.integrations.registry import get_integrations
from app.integrations.telegram import Buttons
from app.services.ids import new_id

logger = logging.getLogger(__name__)


def enabled() -> bool:
    return get_settings().telegram_enabled


def already_sent(s: Session, chat_id: str, dedupe_key: str) -> bool:
    q = select(OutboundMessage).where(OutboundMessage.chat_id == chat_id, OutboundMessage.dedupe_key == dedupe_key)
    return s.exec(q).first() is not None


def chat_role(s: Session, link: TelegramLink) -> str:
    """'husband' / 'mother_in_law' for family links when known, else the link role."""
    if link.role == "family" and link.mother_id:
        q = select(FamilyContact).where(FamilyContact.mother_id == link.mother_id, FamilyContact.phone == link.phone)
        fam = s.exec(q).first()
        if fam and fam.relation:
            return fam.relation
    return link.role


async def raw_send(
    chat_id: str, text: str, buttons: Buttons | None = None, request_contact: str | None = None
) -> str | None:
    """Send one message. Returns an error string instead of raising."""
    timeout = get_settings().telegram_timeout_s * 2 + 2
    try:
        await asyncio.wait_for(
            get_integrations().telegram.send_message(chat_id, text, buttons, request_contact=request_contact), timeout
        )
        return None
    except Exception as exc:  # Telegram must never break a flow
        err = redact_secrets(f"{type(exc).__name__}: {exc}")[:300]
        log(logger, "telegram send failed", logging.WARNING, error=err)
        return err


async def send_logged(
    s: Session, link: TelegramLink, text: str, kind: str, now: datetime, *, buttons: Buttons | None = None,
    ticket_id: str | None = None, dedupe_key: str | None = None,
) -> OutboundMessage | None:  # fmt: skip
    """Send to a linked chat and record it (for dedupe and the dashboard). None if deduped."""
    if dedupe_key and already_sent(s, link.chat_id, dedupe_key):
        return None
    err = await raw_send(link.chat_id, text, buttons)
    msg = OutboundMessage(id=new_id("msg"), mother_id=link.mother_id, chat_id=link.chat_id, chat_role=chat_role(s, link),
                          kind=kind, ticket_id=ticket_id, dedupe_key=dedupe_key, text=text, sent_at=now,
                          delivered=err is None, error=err)  # fmt: skip
    s.add(msg)
    s.commit()
    return msg


def messages_for(s: Session, mother_id: str) -> list[OutboundMessage]:
    q = select(OutboundMessage).where(OutboundMessage.mother_id == mother_id)
    return list(s.exec(q.order_by(col(OutboundMessage.sent_at).desc())))


def active_links(s: Session, mother_id: str, roles: tuple[str, ...] = ("family", "mother")) -> list[TelegramLink]:
    q = select(TelegramLink).where(TelegramLink.mother_id == mother_id, TelegramLink.active == True)  # noqa: E712
    return [link for link in s.exec(q) if link.role in roles]


def asha_links(s: Session, mother: Mother) -> list[TelegramLink]:
    """Active Telegram chats of the mother's own ASHA (linked by the ASHA's phone)."""
    asha = s.get(Asha, mother.asha_id) if mother.asha_id else None
    if asha is None:
        return []
    q = select(TelegramLink).where(TelegramLink.role == "asha", TelegramLink.phone == asha.phone,
                                   TelegramLink.active == True)  # noqa: E712  # fmt: skip
    return list(s.exec(q))

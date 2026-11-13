"""Share her record with the treating doctor: a private link + a one-time code (OTP).

When the family or ASHA confirms "reached hospital", Jodi sends the family (and her ASHA) a link and
a 6-digit code on Telegram. The doctor opens the link and types the code the family tells them.

- Link: 32 random bytes, valid 24 h, revocable.
- Code: valid 10 minutes, usable once, 5 tries, at most 3 re-sends; only its hash is stored.
- After the code: a 30-minute view session. Every view is logged and the family is told.
- The doctor sees a read-only clinical summary: no phone numbers, no call transcripts.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta

from sqlmodel import Session, col, select

from app.core.config import get_settings
from app.core.errors import DomainError, NotFound
from app.core.logging import log
from app.core.time import ensure_utc, iso, to_ist
from app.db.models import AccessLog, Mother, ShareGrant
from app.domain import messages
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.services import record_service
from app.services import telegram_send as tg

logger = logging.getLogger(__name__)

LINK_TTL = timedelta(hours=24)
OTP_TTL = timedelta(minutes=10)
SESSION_TTL = timedelta(minutes=30)
MAX_ATTEMPTS = 5
MAX_RESENDS = 3


class ShareDenied(DomainError):
    status_code = 403


def _hash(token: str, secret: str) -> str:
    return hashlib.sha256(f"{token}:{secret}".encode()).hexdigest()


def _new_otp() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def share_url(token: str) -> str:
    return f"{get_settings().public_app_url.rstrip('/')}/share/{token}"


def _grant(s: Session, token: str, now: datetime) -> ShareGrant:
    g = s.get(ShareGrant, token)
    if g is None:
        raise NotFound("share link not found")
    if g.revoked:
        raise ShareDenied("this link was revoked")
    if g.expires_at is not None and ensure_utc(g.expires_at) <= now:
        raise ShareDenied("this link has expired")
    return g


async def _send_code(s: Session, g: ShareGrant, mother: Mother, otp: str, now: datetime) -> int:
    """The link + code go to the family and her ASHA on Telegram (never into an API response)."""
    text = messages.render("SHARE_CODE", mother.language, name=mother.name, url=share_url(g.token), code=otp,
                           minutes=int(OTP_TTL.total_seconds() // 60))  # fmt: skip
    sent = 0
    for link in [*tg.active_links(s, mother.id), *tg.asha_links(s, mother)]:
        msg = await tg.send_logged(s, link, text, "share", now, ticket_id=g.ticket_id,
                                   dedupe_key=f"share:{g.token}:{g.otp_sends}:{link.chat_id}")  # fmt: skip
        sent += bool(msg and msg.delivered)
    return sent


async def create(s: Session, mother_id: str, by: str, now: datetime, ticket_id: str | None = None) -> ShareGrant:
    """New link + code for her record; any earlier active link for her is revoked first."""
    mother = mrepo.get_mother(s, mother_id)
    for old in s.exec(select(ShareGrant).where(ShareGrant.mother_id == mother_id, ShareGrant.revoked == False)):  # noqa: E712
        old.revoked = True
    token, otp = secrets.token_urlsafe(32), _new_otp()
    g = ShareGrant(token=token, mother_id=mother_id, ticket_id=ticket_id, created_by=by, created_at=now,
                   expires_at=now + LINK_TTL, otp_hash=_hash(token, otp), otp_expires_at=now + OTP_TTL,
                   otp_sends=1)  # fmt: skip
    s.add(g)
    s.commit()
    sent = await _send_code(s, g, mother, otp, now)
    log(logger, "share link created", mother_id=mother_id, by=by, sent=sent)
    return g


async def resend_code(s: Session, token: str, now: datetime) -> ShareGrant:
    g = _grant(s, token, now)
    if g.otp_sends >= MAX_RESENDS:
        raise ShareDenied("too many codes sent; ask the family or ASHA for a new link")
    otp = _new_otp()
    g.otp_hash, g.otp_expires_at, g.otp_attempts, g.otp_used = _hash(token, otp), now + OTP_TTL, 0, False
    g.otp_sends += 1
    s.commit()
    await _send_code(s, g, mrepo.get_mother(s, g.mother_id), otp, now)
    return g


async def verify(s: Session, token: str, otp: str, now: datetime) -> tuple[str, datetime]:
    """Code → a 30-minute view session (returned once). Wrong codes count; 5 wrong locks the code."""
    g = _grant(s, token, now)
    if g.otp_used:
        raise ShareDenied("this code was already used; ask the family to send a new one")
    if g.otp_attempts >= MAX_ATTEMPTS:
        raise ShareDenied("too many wrong codes; ask the family to send a new one")
    if g.otp_expires_at is None or ensure_utc(g.otp_expires_at) <= now:
        raise ShareDenied("this code has expired; ask the family to send a new one")
    if not hmac.compare_digest(_hash(token, otp.strip()), g.otp_hash):
        g.otp_attempts += 1
        s.commit()
        raise ShareDenied(f"wrong code ({MAX_ATTEMPTS - g.otp_attempts} tries left)")
    session = secrets.token_urlsafe(24)
    g.otp_used, g.session_hash, g.session_expires_at = True, _hash(token, session), now + SESSION_TTL
    s.commit()
    return session, ensure_utc(g.session_expires_at)


async def record(s: Session, token: str, session: str, now: datetime) -> dict[str, object]:
    """The doctor's read-only view. Logged; the family is told (once per session)."""
    g = _grant(s, token, now)
    ok = (g.session_hash and g.session_expires_at and ensure_utc(g.session_expires_at) > now
          and hmac.compare_digest(_hash(token, session), g.session_hash))  # fmt: skip
    if not ok:
        raise ShareDenied("enter the one-time code first")
    mother = mrepo.get_mother(s, g.mother_id)
    s.add(AccessLog(who="doctor:share_link", when=now, mother_id=mother.id, allowed=True, scope="share_record"))
    first_view = g.views == 0 or g.last_session_notified != g.session_hash
    g.views += 1
    if first_view:
        g.last_session_notified = g.session_hash
    s.commit()
    if first_view:
        text = messages.render("SHARE_VIEWED", mother.language, name=mother.name, time=to_ist(now).strftime("%H:%M"))
        for link in [*tg.active_links(s, mother.id), *tg.asha_links(s, mother)]:
            await tg.send_logged(
                s, link, text, "share", now, dedupe_key=f"viewed:{g.token}:{g.session_hash}:{link.chat_id}"
            )
    return shared_record(s, mother, now)


def revoke(s: Session, token: str) -> None:
    g = s.get(ShareGrant, token)
    if g is None:
        raise NotFound("share link not found")
    g.revoked = True
    s.commit()


def shared_record(s: Session, mother: Mother, now: datetime) -> dict[str, object]:
    """Clinically useful, minimal: no phone numbers, no transcripts, no family details."""
    from app.core.time import day_since_delivery

    baby = mrepo.baby_of(s, mother.id)
    entries = rrepo.entries_in_order(s, mother.id)
    fired = rrepo.rule_ids_by_interaction(s, mother.id)
    signs = []
    for e in reversed(entries):
        if e.kind == "symptom" and e.value and not e.value.startswith("no "):
            rules = [r for r in fired.get(e.interaction_id or "", []) if r]
            signs.append({"at": e.created_at, "what": e.value, "source": e.source, "subject": e.subject,
                          "rule_ids": rules})  # fmt: skip
        if len(signs) == 10:
            break
    meds = [{"at": e.created_at, "what": e.value} for e in entries if e.kind == "medicine"]
    t = rrepo.active_ticket(s, mother.id)
    audit = record_service.verify(s, mother.id)
    return {
        "mother": {"name": mother.name, "delivery_date": mother.delivery_date.isoformat() if mother.delivery_date else None,
                   "delivery_type": mother.delivery_type, "complications": list(mother.complications),
                   "day_since_delivery": day_since_delivery(mother.delivery_date, now) if mother.delivery_date else None,
                   "status": mother.status, "language": mother.language},
        "baby": {"birth_weight_grams": baby.birth_weight_grams if baby else None,
                 "gestation_weeks": baby.gestation_weeks if baby else None, "status": baby.status if baby else None},
        "alert": {"level": t.level, "reason": t.reason_text, "rule_ids": list(t.rule_ids), "state": t.state} if t else None,
        "danger_signs": signs,
        "medicines": meds,
        "vitals": record_service.vitals(s, mother.id),
        "record_verified": audit.valid,
        "entries": audit.entries,
        "generated_at": iso(now),
    }  # fmt: skip


def latest_for(s: Session, mother_id: str) -> ShareGrant | None:
    q = select(ShareGrant).where(ShareGrant.mother_id == mother_id).order_by(col(ShareGrant.created_at).desc())
    return s.exec(q).first()

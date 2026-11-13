"""Escalation tickets: open → notified → acknowledged → reached → closed.

Dismissal never closes or downgrades. Close only after `reached` AND a later non-red
assessment. Every step is a TicketEvent.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from functools import partial

from sqlmodel import Session, select

from app.core import deferred
from app.core.config import get_settings
from app.core.errors import DomainError
from app.core.logging import log, mask_phone
from app.core.time import ensure_utc
from app.db.models import AshaTask, Mother, Ticket, TicketEvent
from app.db.session import new_session
from app.domain import escalation
from app.domain.rules import Assessment as RuleAssessment
from app.domain.rules import level_rank, max_level
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.services import telegram_alerts
from app.services.ids import new_id

logger = logging.getLogger(__name__)


def add_event(s: Session, t: Ticket, state: str, now: datetime, by: str = "system", note: str = "") -> None:
    s.add(TicketEvent(ticket_id=t.id, at=now, state=state, by=by, note=note))


FAMILY_CALL_GAP = timedelta(seconds=45)  # only stops two calls colliding (two signs in one sentence)
_FAMILY_CALL_NOTES = ("calling family", "family alert call")


def _family_called_recently(s: Session, t: Ticket, now: datetime) -> bool:
    """One family call at a time: a call queued/placed/failed in the last 45 s blocks another."""
    since = now - FAMILY_CALL_GAP
    return any(
        ev.note.startswith(_FAMILY_CALL_NOTES) and ev.at is not None and ensure_utc(ev.at) >= since
        for ev in rrepo.ticket_events(s, t.id)
    )


def _asha_task(s: Session, mother: Mother, reason: str, now: datetime, ticket_id: str | None) -> None:
    if not mother.asha_id:
        return
    """One open visit task per mother; a new reason is appended to the existing task."""
    s.flush()
    existing = s.exec(select(AshaTask).where(AshaTask.mother_id == mother.id, AshaTask.status == "open")).first()
    if existing is not None:
        if reason not in existing.reason:
            existing.reason = f"{existing.reason}; {reason}"
        existing.ticket_id = existing.ticket_id or ticket_id
    else:
        s.add(AshaTask(id=new_id("task"), asha_id=mother.asha_id, mother_id=mother.id, reason=reason,
                       ticket_id=ticket_id, created_at=now))  # fmt: skip


async def _notify_contact(s: Session, t: Ticket, mother: Mother, contact: str, now: datetime, live: bool) -> None:
    from app.services import call_service

    if contact.startswith("asha:"):
        _asha_task(s, mother, f"Visit today: {t.reason_text}", now, t.id)
        note = "ASHA alerted (visit task)"
    elif contact.startswith("anm:"):
        note = "ANM escalation (placeholder: no ANM configured)"
    elif live and get_settings().family_contact == "transfer":
        note = f"family {mask_phone(contact)} connected by call transfer"
    else:
        try:
            await call_service.place_call(s, mother, "family_alert", now, target_phone=contact)
            note = f"family alert call placed to {mask_phone(contact)}"
        except DomainError as exc:
            note = f"family alert call failed: {exc.message}"
    if contact not in t.assigned_to:
        t.assigned_to = [*t.assigned_to, contact]
    add_event(s, t, t.state, now, note=note)


async def _open(s: Session, mother: Mother, a: RuleAssessment, now: datetime, live: bool) -> Ticket:
    t = Ticket(id=new_id("t"), mother_id=mother.id, subjects=a.subjects, level=a.overall_level,
               rule_ids=a.rule_ids, reason_text=a.reason_text, dismissed_by_family=a.dismissed_by_family,
               created_at=now, next_escalation_at=escalation.escalation_due_at(a.overall_level, now))  # fmt: skip
    s.add(t)
    add_event(s, t, "open", now, note=a.reason_text)
    # Only red phones the family straight away; amber goes to Telegram + the ASHA visit task
    # (an unacknowledged amber ticket still escalates to the family later, see escalation_tick).
    first_family = _first_family(s, mother) if t.level == "red" else None
    if first_family:
        add_event(s, t, t.state, now, note="calling family")
    if mother.asha_id:
        await _notify_contact(s, t, mother, f"asha:{mother.asha_id}", now, live)
    escalation.check_transition("open", "notified")
    t.state = "notified"
    add_event(s, t, "notified", now)
    log(logger, "ticket opened", ticket_id=t.id, risk_level=t.level, rule_ids=t.rule_ids)
    s.commit()
    job = partial(_contact_family_then_telegram, t.id, mother.id, first_family, now, live)
    if not deferred.defer(job):  # inside a live tool call: runs right after Jodi gets her answer
        await _contact_family(s, t, mother, first_family, now, live)
    return t


def _first_family(s: Session, mother: Mother) -> str | None:
    chain = escalation.escalation_chain(
        [(f.phone, f.decision_maker) for f in mrepo.family_of(s, mother.id)], mother.asha_id
    )
    return next((c for c in chain if c.startswith("+")), None)


async def _contact_family(s: Session, t: Ticket, mother: Mother, contact: str | None, now: datetime,
                          live: bool, new_signs: tuple[str, ...] = ()) -> None:  # fmt: skip
    """Phone call (or transfer note) first; Telegram is extra and always comes after it."""
    if contact:
        await _notify_contact(s, t, mother, contact, now, live)
        s.commit()
    await telegram_alerts.notify_ticket(s, t, mother, now, "open", new_signs=new_signs)
    s.commit()


async def _contact_family_then_telegram(ticket_id: str, mother_id: str, contact: str | None, now: datetime,
                                        live: bool, new_signs: tuple[str, ...] = ()) -> None:  # fmt: skip
    """Background version (own DB session): failures are logged, never raised."""
    try:
        with new_session() as s:
            t, mother = s.get(Ticket, ticket_id), mrepo.get_mother(s, mother_id)
            if t is not None:
                await _contact_family(s, t, mother, contact, now, live, new_signs)
    except Exception as exc:  # noqa: BLE001 - a background job must never crash the app
        log(logger, "family contact failed", logging.ERROR, ticket_id=ticket_id, error=type(exc).__name__)


def _update(s: Session, t: Ticket, a: RuleAssessment, now: datetime) -> bool:
    """Merge a new assessment into the ticket (never lowers). Returns True if the level rose."""
    raised = level_rank(a.overall_level) > level_rank(t.level)
    t.level = max_level(t.level, a.overall_level)
    t.rule_ids = list(dict.fromkeys([*t.rule_ids, *a.rule_ids]))
    t.subjects = list(dict.fromkeys([*t.subjects, *a.subjects]))
    if a.reason_text and a.reason_text not in t.reason_text:
        t.reason_text = "; ".join(x for x in (t.reason_text, a.reason_text) if x)
    if raised and t.state in ("open", "notified"):
        t.next_escalation_at = escalation.next_escalation_after_update(t.next_escalation_at, t.level, now)
        add_event(s, t, t.state, now, note=f"raised to {t.level}")
    return raised


async def _realert(s: Session, t: Ticket, mother: Mother, new_red: tuple[str, ...], now: datetime,
                   live: bool, call: bool) -> None:  # fmt: skip
    """New red sign → ASHA + Telegram again. `call` → phone the family again too."""
    if new_red:
        add_event(s, t, t.state, now, note=f"new danger sign: {', '.join(new_red)}")
        if mother.asha_id:
            await _notify_contact(s, t, mother, f"asha:{mother.asha_id}", now, live)
    contact = _first_family(s, mother) if call else None
    if contact:
        add_event(s, t, t.state, now, note="calling family")
    s.commit()
    job = partial(_contact_family_then_telegram, t.id, mother.id, contact, now, live, new_red)
    if not deferred.defer(job):
        await _contact_family(s, t, mother, contact, now, live, new_red)
    log(logger, "ticket re-alerted", ticket_id=t.id, new_signs=list(new_red))


async def _telegram_raised(ticket_id: str, mother_id: str, now: datetime) -> None:
    try:
        with new_session() as s:
            t = s.get(Ticket, ticket_id)
            if t is not None:
                await telegram_alerts.notify_ticket(s, t, mrepo.get_mother(s, mother_id), now, "raised")
                s.commit()
    except Exception as exc:  # noqa: BLE001
        log(logger, "telegram raised alert failed", logging.ERROR, ticket_id=ticket_id, error=type(exc).__name__)


def mark_dismissed(s: Session, t: Ticket, now: datetime, by: str = "family") -> None:
    if not t.dismissed_by_family:
        t.dismissed_by_family = True
        add_event(s, t, t.state, now, by=by, note="dismissed by family; escalation continues")


def close_if_resolved(s: Session, mother_id: str, level: str, now: datetime) -> None:
    for t in rrepo.tickets(s, None):
        if t.mother_id == mother_id and escalation.can_close(t.state, t.reached_at, now, level):
            t.state, t.closed_at, t.next_escalation_at = "closed", now, None
            add_event(s, t, "closed", now, note=f"follow-up assessment {level} after reached")


async def apply_assessment(s: Session, mother: Mother, a: RuleAssessment, now: datetime, live: bool) -> Ticket | None:
    """Create/update the mother's ticket from an assessment; may close a reached ticket."""
    close_if_resolved(s, mother.id, a.overall_level, now)
    t = rrepo.active_ticket(s, mother.id)
    if a.overall_level != "green":
        if t is None or (t.state == "reached" and a.overall_level == "red"):
            t = await _open(s, mother, a, now, live)
        else:
            # A red sign not yet on this ticket (e.g. the baby now, after the mother earlier) is a new
            # emergency: alert the family and ASHA again. The same sign again stays quiet (deduped).
            new_red = tuple(
                dict.fromkeys(r.rule_id for r in a.fired if r.level == "red" and r.rule_id not in t.rule_ids)
            )
            raised = _update(s, t, a, now)
            if a.dismissed_by_family:
                mark_dismissed(s, t, now)
            # Red again while the family has not acknowledged: call them again (one call at a time).
            call = (a.overall_level == "red" and t.state in ("open", "notified")
                    and not _family_called_recently(s, t, now))  # fmt: skip
            if new_red or call:
                await _realert(s, t, mother, new_red, now, live, call)
            elif raised:
                s.commit()
                job = partial(_telegram_raised, t.id, mother.id, now)
                if not deferred.defer(job):
                    await telegram_alerts.notify_ticket(s, t, mother, now, "raised")
    if a.asha_task:
        _asha_task(s, mother, "2 calls unanswered: please visit", now, t.id if t else None)
    s.commit()
    return t


def acknowledge(s: Session, ticket_id: str, by: str, note: str, now: datetime) -> Ticket:
    t = rrepo.get_ticket(s, ticket_id)
    escalation.check_transition(t.state, "acknowledged")
    t.state, t.acknowledged_at, t.next_escalation_at = "acknowledged", now, None
    add_event(s, t, "acknowledged", now, by=by, note=note)
    s.commit()
    return t


def mark_reached(s: Session, ticket_id: str, by: str, note: str, now: datetime) -> Ticket:
    from app.domain.scheduling import red_recheck
    from app.services import call_service

    t = rrepo.get_ticket(s, ticket_id)
    escalation.check_transition(t.state, "reached")
    if t.acknowledged_at is None:
        t.acknowledged_at = now
    t.state, t.reached_at, t.next_escalation_at = "reached", now, None
    add_event(s, t, "reached", now, by=by, note=note)
    for task in s.exec(select(AshaTask).where(AshaTask.mother_id == t.mother_id, AshaTask.status == "open")):
        task.status = "done"
    if t.level == "red":
        call_service.schedule(s, mrepo.get_mother(s, t.mother_id), red_recheck(now), now)
    s.commit()
    return t


async def escalation_tick(s: Session, now: datetime) -> int:
    """Move overdue (un-acknowledged) tickets to the next contact. Returns tickets escalated."""
    count = 0
    for t in rrepo.due_tickets(s, now):
        if not escalation.is_escalation_due(t.state, t.next_escalation_at, now):
            continue
        mother = mrepo.get_mother(s, t.mother_id)
        chain = escalation.escalation_chain(
            [(f.phone, f.decision_maker) for f in mrepo.family_of(s, mother.id)], mother.asha_id
        )
        contact = escalation.next_contact(chain, list(t.assigned_to))
        if contact is None:
            t.next_escalation_at = None
            add_event(s, t, t.state, now, note="all contacts notified; awaiting acknowledgement")
        else:
            await _notify_contact(s, t, mother, contact, now, live=False)
            add_event(s, t, t.state, now, note=f"escalated: no ack within {escalation.ESCALATION_MINUTES[t.level]} min")
            t.next_escalation_at = escalation.escalation_due_at(t.level, now)
            s.commit()
            await telegram_alerts.notify_ticket(s, t, mother, now, "reminder")
        count += 1
    s.commit()
    return count

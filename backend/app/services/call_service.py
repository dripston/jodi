"""Outbound calls, call logs, the schedule, missed-call handling."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlmodel import Session

from app.core.errors import DomainError
from app.core.logging import log, mask_phone
from app.core.time import is_quiet_hours, next_allowed_time
from app.db.models import CallLog, Mother, ScheduledCall
from app.domain import scheduling
from app.integrations.registry import get_integrations
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.services.ids import new_id

logger = logging.getLogger(__name__)
BIND_WINDOW = timedelta(minutes=15)


async def place_call(
    s: Session, mother: Mother, purpose: str, now: datetime, *, target_phone: str | None = None,
    scheduled: ScheduledCall | None = None,
) -> CallLog:  # fmt: skip
    """Place one outbound call via the integration; returns the CallLog (interaction id may be
    re-bound to Sarvam's real InteractionID when /hooks/on-start arrives)."""
    phone = target_phone or mother.phone
    role = "mother" if phone == mother.phone else "family"
    variables = {
        "call_direction": "outbound", "call_purpose": purpose, "callee_phone": phone,
        "mother_id": mother.id, "language": mother.language,
    }  # fmt: skip
    placed = await get_integrations().call_placer.place_call(phone, purpose, variables)
    call = CallLog(interaction_id=placed.attempt_id, attempt_id=placed.attempt_id, mother_id=mother.id,
                   phone=phone, caller_role=role, purpose=purpose, direction="outbound",
                   language=mother.language, started_at=now, status="placed",
                   scheduled_call_id=scheduled.id if scheduled else None)  # fmt: skip
    s.add(call)
    if scheduled:
        scheduled.status, scheduled.interaction_id = "placed", call.interaction_id
    s.commit()
    log(logger, "call placed", purpose=purpose, phone=mask_phone(phone), interaction_id=call.interaction_id)
    return call


def bind_on_start(s: Session, interaction_id: str, phone: str, direction: str | None, now: datetime) -> CallLog:
    """Find (or create) the CallLog for a starting call, re-binding a placed outbound call."""
    existing = rrepo.call_log(s, interaction_id)
    if existing:
        return existing
    candidate = rrepo.unbound_outbound(s, phone, now - BIND_WINDOW) if phone else None
    if candidate is None and not phone and direction == "outbound":
        recent = rrepo.latest_placed_outbound(s, now - timedelta(minutes=2))
        candidate = recent[0] if len(recent) == 1 else None
    if candidate is not None:
        old_id = candidate.interaction_id
        candidate.interaction_id, candidate.status, candidate.started_at = interaction_id, "started", now
        sched = s.get(ScheduledCall, candidate.scheduled_call_id) if candidate.scheduled_call_id else None
        if sched and sched.interaction_id == old_id:
            sched.interaction_id = interaction_id
        s.commit()
        return candidate
    call = CallLog(interaction_id=interaction_id, phone=phone or None, direction=direction or "inbound",
                   purpose="inbound", started_at=now, status="started")  # fmt: skip
    s.add(call)
    s.commit()
    return call


# ------------------------------------------------------------------ schedule
def schedule(s: Session, mother: Mother, planned: scheduling.PlannedCall, now: datetime,
             parent: ScheduledCall | None = None) -> ScheduledCall:  # fmt: skip
    target = None
    if planned.target == "family":
        dm = mrepo.decision_maker(s, mother.id)
        target = dm.phone if dm else None
    if planned.reason in ("amber_recheck", "red_recheck"):
        for p in rrepo.pending_scheduled(s, mother.id):
            if p.reason == planned.reason:
                p.status = "cancelled"
    row = ScheduledCall(id=new_id("sc"), mother_id=mother.id, purpose=planned.purpose, reason=planned.reason,
                        due_at=scheduling.effective_due(planned, planned.routine, now), routine=planned.routine,
                        attempt=planned.attempt, target_phone=target, day=planned.day,
                        parent_id=parent.id if parent else None, created_at=now)  # fmt: skip
    s.add(row)
    s.commit()
    return row


def plan_milestones(s: Session, mother: Mother, now: datetime) -> list[ScheduledCall]:
    """(Re)plan the routine milestone schedule from the delivery date."""
    for p in rrepo.pending_scheduled(s, mother.id):
        if p.reason in ("milestone", "high_risk_daily"):
            p.status = "cancelled"
    s.commit()
    if not mother.delivery_date:
        return []
    high = mother.risk_profile == "high"
    return [schedule(s, mother, c, now) for c in scheduling.milestone_calls(mother.delivery_date, high, now)]


async def run_due_calls(s: Session, now: datetime) -> int:
    placed = 0
    for sc in rrepo.due_scheduled(s, now):
        if sc.routine and is_quiet_hours(now):
            sc.due_at = next_allowed_time(now)
            s.commit()
            continue
        mother = mrepo.get_mother(s, sc.mother_id)
        try:
            await place_call(s, mother, sc.purpose, now, target_phone=sc.target_phone, scheduled=sc)
            placed += 1
        except DomainError as exc:
            sc.status = "failed"
            s.commit()
            log(logger, "scheduled call failed", logging.WARNING, scheduled_id=sc.id, error=exc.message)
    return placed


async def handle_missed(s: Session, call: CallLog, now: datetime) -> None:
    """Missed scheduled call: retry +30 min → family → final miss (H-MISSED-01 counter)."""
    sc = s.get(ScheduledCall, call.scheduled_call_id) if call.scheduled_call_id else None
    if sc is None or call.mother_id is None:
        return
    sc.status = "missed"
    mother = mrepo.get_mother(s, call.mother_id)
    outcome = scheduling.after_missed(sc.attempt, sc.routine, now)
    if outcome.next_call:
        schedule(s, mother, outcome.next_call, now, parent=sc)
    if outcome.final_miss:
        mother.consecutive_missed += 1
        s.commit()
        from app.services import assessment_service

        await assessment_service.assess_missed_calls(s, mother, now)
    s.commit()


def mark_answered(s: Session, call: CallLog) -> None:
    sc = s.get(ScheduledCall, call.scheduled_call_id) if call.scheduled_call_id else None
    if sc:
        sc.status = "answered"
    if call.mother_id and call.caller_role in ("mother", "family"):
        mother = mrepo.get_mother(s, call.mother_id)
        mother.consecutive_missed = 0
    s.commit()

"""Call schedule (docs/clinical-rules.md "Schedule"). Pure: `now` is always passed in.

- Milestone calls: day 1, 3, 4, 5, 7, 14, 21, 28, 42.
- High-risk profile: daily calls days 1–10 (plus the remaining milestones).
- Amber: recheck +6 h. Red: recheck 2 h after `reached`.
- Missed call: retry +30 min → family decision-maker → ASHA task (H-MISSED-01).
- Routine calls only 07:00–21:00 IST; rechecks/inbound always allowed.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from app.core.time import ist_at, next_allowed_time

MILESTONE_DAYS = (1, 3, 4, 5, 7, 14, 21, 28, 42)
HIGH_RISK_DAILY = range(1, 11)
ROUTINE_HOUR_IST = 10  # milestone calls placed at 10:00 IST on the day
AMBER_RECHECK = timedelta(hours=6)
RED_RECHECK_AFTER_REACHED = timedelta(hours=2)
MISSED_RETRY = timedelta(minutes=30)
HIGH_BP = frozenset({"high_bp_in_pregnancy", "pre_eclampsia", "preeclampsia", "eclampsia",
                     "gestational_hypertension", "chronic_hypertension"})  # fmt: skip


@dataclass(frozen=True)
class PlannedCall:
    due_at: datetime
    purpose: str  # CallPurpose
    reason: str  # milestone | high_risk_daily | amber_recheck | red_recheck | missed_retry | family_followup
    routine: bool
    day: int | None = None
    attempt: int = 0
    target: str = "mother"  # mother | family


def is_high_risk(
    delivery_type: str | None,
    complications: list[str] | tuple[str, ...],
    birth_weight_grams: int | None,
    gestation_weeks: int | None,
) -> bool:
    return (
        delivery_type == "c_section"
        or any(c in HIGH_BP for c in complications)
        or (birth_weight_grams is not None and birth_weight_grams < 2500)
        or (gestation_weeks is not None and gestation_weeks < 37)
        or "preterm_birth" in complications  # "born before 37 weeks" reported without a week count
    )


def call_days(high_risk: bool) -> list[int]:
    days = set(MILESTONE_DAYS)
    if high_risk:
        days.update(HIGH_RISK_DAILY)
    return sorted(days)


def milestone_calls(delivery_date: date, high_risk: bool, now: datetime) -> list[PlannedCall]:
    """Future routine check-ins (days whose call time has not yet passed)."""
    out: list[PlannedCall] = []
    for day in call_days(high_risk):
        due = ist_at(delivery_date + timedelta(days=day), ROUTINE_HOUR_IST)
        if due > now:
            reason = "milestone" if day in MILESTONE_DAYS else "high_risk_daily"
            out.append(PlannedCall(due, "checkin", reason, routine=True, day=day))
    return out


def amber_recheck(now: datetime, hours: int | None = None) -> PlannedCall:
    delta = timedelta(hours=hours) if hours else AMBER_RECHECK
    return PlannedCall(now + delta, "checkin", "amber_recheck", routine=False)


def red_recheck(reached_at: datetime) -> PlannedCall:
    return PlannedCall(reached_at + RED_RECHECK_AFTER_REACHED, "checkin", "red_recheck", routine=False)


@dataclass(frozen=True)
class MissedOutcome:
    next_call: PlannedCall | None
    final_miss: bool  # True → this scheduled call counts as unanswered (H-MISSED-01 counter)


def after_missed(attempt: int, routine: bool, now: datetime) -> MissedOutcome:
    """attempt 0 (mother) → retry mother +30 min; attempt 1 → family decision-maker; then final."""
    if attempt == 0:
        due = now + MISSED_RETRY
        return MissedOutcome(PlannedCall(due, "checkin", "missed_retry", routine, attempt=1), False)
    if attempt == 1:
        return MissedOutcome(PlannedCall(now, "checkin", "family_followup", routine, attempt=2, target="family"), False)
    return MissedOutcome(None, True)


def effective_due(call: PlannedCall | datetime, routine: bool, now: datetime) -> datetime:
    """Routine calls never ring during quiet hours: defer to the next 07:00 IST."""
    due = call.due_at if isinstance(call, PlannedCall) else call
    candidate = max(due, now)
    return next_allowed_time(candidate) if routine else candidate

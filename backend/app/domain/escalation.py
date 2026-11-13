"""Ticket state machine + escalation timing (docs/clinical-rules.md "Escalation timing"). Pure.

open → notified → acknowledged → reached → closed. Dismissal never closes or downgrades.
Close only after `reached` AND a later assessment that is not red.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from app.core.errors import InvalidTransition

STATES = ("open", "notified", "acknowledged", "reached", "closed")
ESCALATION_MINUTES = {"red": 10, "amber": 60}

_ALLOWED: dict[str, frozenset[str]] = {
    "open": frozenset({"notified", "acknowledged", "reached"}),
    "notified": frozenset({"acknowledged", "reached"}),
    "acknowledged": frozenset({"reached"}),
    "reached": frozenset({"closed"}),
    "closed": frozenset(),
}


def can_transition(current: str, target: str) -> bool:
    return target in _ALLOWED.get(current, frozenset())


def check_transition(current: str, target: str) -> None:
    if not can_transition(current, target):
        raise InvalidTransition(f"ticket cannot move from {current} to {target}")


def escalation_due_at(level: str, now: datetime) -> datetime:
    return now + timedelta(minutes=ESCALATION_MINUTES[level])


def next_escalation_after_update(current_due: datetime | None, level: str, now: datetime) -> datetime:
    """When a ticket is raised/updated, keep the sooner of the existing and new deadline."""
    new_due = escalation_due_at(level, now)
    return min(current_due, new_due) if current_due else new_due


def is_escalation_due(state: str, due: datetime | None, now: datetime) -> bool:
    return state in ("open", "notified") and due is not None and now >= due


def can_close(state: str, reached_at: datetime | None, assessment_at: datetime, level: str) -> bool:
    """A later non-red assessment after `reached` closes the ticket."""
    return state == "reached" and reached_at is not None and assessment_at > reached_at and level != "red"


def escalation_chain(family: list[tuple[str, bool]], asha_id: str | None) -> list[str]:
    """Ordered contacts: decision-maker → other family phones → ASHA → ANM placeholder.

    `family` = [(phone, decision_maker)], phones as E.164.
    """
    ordered = [p for p, dm in family if dm] + [p for p, dm in family if not dm]
    chain = list(dict.fromkeys(ordered))
    if asha_id:
        chain.append(f"asha:{asha_id}")
    chain.append("anm:placeholder")
    return chain


def next_contact(chain: list[str], already: list[str]) -> str | None:
    for c in chain:
        if c not in already:
            return c
    return None

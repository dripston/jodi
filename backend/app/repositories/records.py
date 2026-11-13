"""Entries, assessments, tickets, calls, pending updates (no business logic)."""

from __future__ import annotations

from datetime import datetime

from sqlmodel import Session, col, select

from app.core.errors import NotFound
from app.db.models import (
    Assessment,
    CallLog,
    Entry,
    PendingUpdate,
    ScheduledCall,
    Ticket,
    TicketEvent,
)


# ---------------------------------------------------------------- entries
def entries_in_order(s: Session, mother_id: str) -> list[Entry]:
    return list(s.exec(select(Entry).where(Entry.mother_id == mother_id).order_by(col(Entry.seq))))


def last_entry(s: Session, mother_id: str) -> Entry | None:
    return s.exec(select(Entry).where(Entry.mother_id == mother_id).order_by(col(Entry.seq).desc())).first()


def timeline(s: Session, mother_id: str, since: str | None) -> list[Entry]:
    q = select(Entry).where(Entry.mother_id == mother_id)
    if since:
        q = q.where(Entry.created_at > since)
    return list(s.exec(q.order_by(col(Entry.seq).desc())))


def entries_for_interaction(s: Session, interaction_id: str) -> list[Entry]:
    return list(s.exec(select(Entry).where(Entry.interaction_id == interaction_id)))


# ------------------------------------------------------------ assessments
def assessment_for_interaction(s: Session, interaction_id: str) -> Assessment | None:
    return s.exec(select(Assessment).where(Assessment.interaction_id == interaction_id)).first()


def rule_ids_by_interaction(s: Session, mother_id: str) -> dict[str, list[str]]:
    """interaction_id → rules fired in that interaction (latest assessment wins)."""
    q = select(Assessment).where(Assessment.mother_id == mother_id).order_by(col(Assessment.id))
    return {a.interaction_id: list(a.rule_ids) for a in s.exec(q)}


def previous_assessment(s: Session, mother_id: str, exclude_interaction: str | None) -> Assessment | None:
    q = select(Assessment).where(Assessment.mother_id == mother_id)
    if exclude_interaction:
        q = q.where(Assessment.interaction_id != exclude_interaction)
    return s.exec(q.order_by(col(Assessment.created_at).desc(), col(Assessment.id).desc())).first()


def latest_assessment(s: Session, mother_id: str) -> Assessment | None:
    return previous_assessment(s, mother_id, None)


# ---------------------------------------------------------------- tickets
def get_ticket(s: Session, ticket_id: str) -> Ticket:
    t = s.get(Ticket, ticket_id)
    if t is None:
        raise NotFound(f"ticket {ticket_id} not found")
    return t


def active_ticket(s: Session, mother_id: str) -> Ticket | None:
    q = select(Ticket).where(Ticket.mother_id == mother_id, Ticket.state != "closed")
    return s.exec(q.order_by(col(Ticket.created_at).desc())).first()


def tickets(s: Session, state: str | None) -> list[Ticket]:
    q = select(Ticket)
    if state == "open":
        q = q.where(Ticket.state != "closed")
    elif state:
        q = q.where(Ticket.state == state)
    return list(s.exec(q.order_by(col(Ticket.created_at).desc())))


def ticket_events(s: Session, ticket_id: str) -> list[TicketEvent]:
    return list(s.exec(select(TicketEvent).where(TicketEvent.ticket_id == ticket_id).order_by(col(TicketEvent.id))))


def due_tickets(s: Session, now: datetime) -> list[Ticket]:
    q = select(Ticket).where(col(Ticket.state).in_(["open", "notified"]), col(Ticket.next_escalation_at) <= now)
    return list(s.exec(q))


# ------------------------------------------------------------------ calls
def call_log(s: Session, interaction_id: str) -> CallLog | None:
    return s.get(CallLog, interaction_id)


def get_call(s: Session, interaction_id: str) -> CallLog:
    c = call_log(s, interaction_id)
    if c is None:
        raise NotFound(f"call {interaction_id} not found")
    return c


def recent_calls(s: Session, limit: int = 20, mother_id: str | None = None) -> list[CallLog]:
    q = select(CallLog)
    if mother_id:
        q = q.where(CallLog.mother_id == mother_id)
    return list(s.exec(q.order_by(col(CallLog.started_at).desc()).limit(limit)))


def unbound_outbound(s: Session, phone: str, since: datetime) -> CallLog | None:
    q = select(CallLog).where(
        CallLog.phone == phone, CallLog.direction == "outbound", CallLog.status == "placed",
        col(CallLog.started_at) >= since,
    )  # fmt: skip
    return s.exec(q.order_by(col(CallLog.started_at).desc())).first()


def latest_placed_outbound(s: Session, since: datetime) -> list[CallLog]:
    q = select(CallLog).where(CallLog.direction == "outbound", CallLog.status == "placed",
                              col(CallLog.started_at) >= since)  # fmt: skip
    return list(s.exec(q.order_by(col(CallLog.started_at).desc())))


def call_by_attempt(s: Session, attempt_id: str) -> CallLog | None:
    return s.exec(select(CallLog).where(CallLog.attempt_id == attempt_id)).first()


def pending_scheduled(s: Session, mother_id: str | None = None) -> list[ScheduledCall]:
    q = select(ScheduledCall).where(ScheduledCall.status == "pending")
    if mother_id:
        q = q.where(ScheduledCall.mother_id == mother_id)
    return list(s.exec(q.order_by(col(ScheduledCall.due_at))))


def due_scheduled(s: Session, now: datetime) -> list[ScheduledCall]:
    q = select(ScheduledCall).where(ScheduledCall.status == "pending", col(ScheduledCall.due_at) <= now)
    return list(s.exec(q.order_by(col(ScheduledCall.due_at))))


def get_pending(s: Session, pending_id: str) -> PendingUpdate:
    p = s.get(PendingUpdate, pending_id)
    if p is None:
        raise NotFound(f"pending update {pending_id} not found")
    return p

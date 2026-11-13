"""Overview KPIs (brief §5.5) and status-by-day."""

from __future__ import annotations

import statistics
from datetime import datetime, timedelta
from typing import Any

from sqlmodel import Session, select

from app.core.time import day_since_delivery, ist_today, to_ist
from app.db.models import AshaTask, CallLog, Entry, ScheduledCall, Ticket
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo

WINDOW = timedelta(days=42)


def _recent_tickets(s: Session, now: datetime) -> list[Ticket]:
    return [t for t in s.exec(select(Ticket)) if t.created_at and t.created_at >= now - WINDOW]


def median_minutes_to_contact(s: Session, now: datetime) -> float | None:
    mins = []
    for t in _recent_tickets(s, now):
        events = rrepo.ticket_events(s, t.id)
        ack = next((e.at for e in events if e.state == "acknowledged" and e.at), t.acknowledged_at)
        if ack and t.created_at:
            mins.append((ack - t.created_at).total_seconds() / 60)
    return round(statistics.median(mins), 1) if mins else None


def asha_visit_within_24h_pct(s: Session, now: datetime) -> float | None:
    tickets = _recent_tickets(s, now)
    if not tickets:
        return None
    hit = 0
    for t in tickets:
        assert t.created_at is not None
        limit = t.created_at + timedelta(hours=24)
        start_iso, end_iso = t.created_at.strftime("%Y-%m-%dT%H:%M:%SZ"), limit.strftime("%Y-%m-%dT%H:%M:%SZ")
        measured = s.exec(select(Entry).where(Entry.mother_id == t.mother_id, Entry.source == "asha_measured",
                                              Entry.created_at >= start_iso, Entry.created_at <= end_iso)).first()  # fmt: skip
        reached = any(e.state == "reached" and e.by.startswith("asha:") and e.at and e.at <= limit
                      for e in rrepo.ticket_events(s, t.id))  # fmt: skip
        hit += bool(measured or reached)
    return round(100.0 * hit / len(tickets), 1)


def calls_today(s: Session, now: datetime) -> dict[str, int]:
    today = ist_today(now)
    sched = [c for c in s.exec(select(ScheduledCall))
             if c.status != "cancelled" and c.due_at and to_ist(c.due_at).date() == today]  # fmt: skip
    logs = [c for c in s.exec(select(CallLog)) if c.started_at and to_ist(c.started_at).date() == today]
    completed = sum(1 for c in logs if c.answered)
    missed = sum(1 for c in logs if c.status == "ended" and not c.answered)
    return {"scheduled": len(sched), "completed": completed, "missed": missed}


def stats(s: Session, now: datetime) -> dict[str, Any]:
    mothers = mrepo.list_mothers(s)
    open_t = rrepo.tickets(s, "open")
    active = [m for m in mothers if m.delivery_date and day_since_delivery(m.delivery_date, now) <= 42]
    return {
        "mothers_enrolled": len(mothers),
        "active_dyads": len(active),
        "open_alerts": {"red": sum(t.level == "red" for t in open_t), "amber": sum(t.level == "amber" for t in open_t)},
        "median_minutes_to_contact": median_minutes_to_contact(s, now),
        "asha_visit_within_24h_pct": asha_visit_within_24h_pct(s, now),
        "calls_today": calls_today(s, now),
        "asha_tasks_open": len(list(s.exec(select(AshaTask).where(AshaTask.status == "open")))),
    }


def status_by_day(s: Session, now: datetime) -> list[dict[str, int]]:
    rows = [{"day": d, "green": 0, "amber": 0, "red": 0} for d in range(43)]
    for m in mrepo.list_mothers(s):
        if m.delivery_date:
            d = day_since_delivery(m.delivery_date, now)
            if d <= 42:
                rows[d][m.status] += 1
    return rows

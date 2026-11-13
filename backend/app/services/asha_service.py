"""ASHA priority list: red → amber → missed calls → routine."""

from __future__ import annotations

from datetime import datetime

from sqlmodel import Session

from app.core.time import day_since_delivery
from app.db.models import Mother
from app.domain.rules import level_rank
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo


def _reason(s: Session, m: Mother, now: datetime) -> tuple[str, str | None]:
    t = rrepo.active_ticket(s, m.id)
    if t:
        dismissed = " (family said it is normal)" if t.dismissed_by_family else ""
        return f"{t.reason_text}{dismissed}", t.id
    if m.consecutive_missed:
        return f"{m.consecutive_missed} missed call{'s' if m.consecutive_missed > 1 else ''}", None
    day = day_since_delivery(m.delivery_date, now) if m.delivery_date else None
    return (f"Routine, day {day}" if day is not None else "Routine"), None


def priority_list(s: Session, asha_id: str, now: datetime) -> list[tuple[Mother, int, str, str | None]]:
    """[(mother, priority 1..n, reason, ticket_id)] sorted by urgency."""
    mrepo.get_asha(s, asha_id)
    rows = []
    for m in mrepo.mothers_of_asha(s, asha_id):
        reason, tid = _reason(s, m, now)
        day = day_since_delivery(m.delivery_date, now) if m.delivery_date else 99
        rows.append((m, reason, tid, (-level_rank(m.status), -m.consecutive_missed, day)))
    rows.sort(key=lambda r: r[3])
    return [(m, i + 1, reason, tid) for i, (m, reason, tid, _) in enumerate(rows)]


def spoken_list(s: Session, asha_id: str, now: datetime) -> str:
    items = priority_list(s, asha_id, now)
    return " ".join(f"{p}. {m.name} – {m.status} – {reason}." for m, p, reason, _ in items)

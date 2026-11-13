"""Mother/baby status = max(latest assessment, open tickets) (contracts §2)."""

from __future__ import annotations

from sqlmodel import Session

from app.db.models import Mother
from app.domain.rules import max_level
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo


def refresh_status(s: Session, mother: Mother) -> None:
    latest = rrepo.latest_assessment(s, mother.id)
    open_tickets = [t for t in rrepo.tickets(s, "open") if t.mother_id == mother.id]
    overall = max_level("green", latest.overall_level if latest else "green", *(t.level for t in open_tickets))
    mother.status = overall
    baby = mrepo.baby_of(s, mother.id)
    if baby:
        baby_ticket = [t.level for t in open_tickets if "baby" in t.subjects]
        baby.status = max_level("green", latest.baby_level if latest else "green", *baby_ticket)
    s.commit()

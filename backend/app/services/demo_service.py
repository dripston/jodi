"""Demo controls: reset + seed, advance-day, inject (same pipeline as /hooks/on-end)."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlmodel import Session

from app.db.models import CallLog
from app.db.session import reset_db
from app.repositories import mothers as mrepo
from app.schemas.api import InjectIn, OnEndIn
from app.seed.seed_data import seed
from app.services import call_service, voice_service
from app.services.assessment_service import _CACHE
from app.services.ids import new_id


def reset(s: Session, now: datetime) -> None:
    s.close()
    reset_db()
    _CACHE.clear()
    seed(s, now)


def advance_day(s: Session, mother_id: str, days: int, now: datetime) -> None:
    m = mrepo.get_mother(s, mother_id)
    if m.delivery_date:
        m.delivery_date = m.delivery_date - timedelta(days=days)
        s.commit()
        call_service.plan_milestones(s, m, now)


async def inject(s: Session, body: InjectIn, now: datetime) -> str:
    m = mrepo.get_mother(s, body.mother_id)
    iid = body.interaction_id or new_id("demo")
    phone = body.caller_phone or m.phone
    if s.get(CallLog, iid) is None:
        ident = voice_service.identify(s, phone)
        role = ident.role if body.mother_id in ident.mother_ids else "unknown"
        s.add(CallLog(interaction_id=iid, mother_id=m.id if role in ("mother", "family") else None, phone=phone,
                      caller_role=role, purpose="checkin" if role == "mother" else "inbound", direction="inbound",
                      language=m.language, started_at=now, status="started"))  # fmt: skip
        s.commit()
    out = await voice_service.on_end(s, OnEndIn(phone=phone, interaction_id=iid, transcript=body.transcript,
                                                answered=True), now)  # fmt: skip
    return str(out.get("level") or "green")

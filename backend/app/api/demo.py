"""/api/demo/* — mounted only when DEMO_MODE=true."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import now
from app.db.session import get_session
from app.repositories import mothers as mrepo
from app.schemas.api import AdvanceDayIn, InjectIn, InjectOut, MotherOut, OkOut
from app.services import demo_service
from app.services.serializers import mother_out

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/reset", response_model=OkOut)
def reset(s: Session = Depends(get_session), t: datetime = Depends(now)) -> OkOut:
    demo_service.reset(s, t)
    return OkOut()


@router.post("/advance-day", response_model=MotherOut)
def advance_day(body: AdvanceDayIn, s: Session = Depends(get_session), t: datetime = Depends(now)) -> MotherOut:
    demo_service.advance_day(s, body.mother_id, body.days, t)
    return mother_out(s, mrepo.get_mother(s, body.mother_id), t)


@router.post("/inject", response_model=InjectOut)
async def inject(body: InjectIn, s: Session = Depends(get_session), t: datetime = Depends(now)) -> InjectOut:
    level = await demo_service.inject(s, body, t)
    return InjectOut(ok=True, level=level)  # type: ignore[arg-type]

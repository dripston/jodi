"""/tools/* — Sarvam mid-call API tools (contracts §4.2–4.7)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel import Session

from app.api.deps import now, reply_first
from app.core.security import require_tool_secret
from app.db.session import get_session
from app.schemas.api import (
    AssessRiskIn,
    AssessRiskOut,
    ConfirmIn,
    ConfirmOut,
    FindFacilityIn,
    FindFacilityOut,
    OnboardingSaveIn,
    PendingOut,
    ReadSummaryIn,
    ReadSummaryOut,
    RecordUpdateIn,
)
from app.services import onboarding_service, update_service, voice_service

router = APIRouter(prefix="/tools", tags=["tools"], dependencies=[Depends(require_tool_secret)])


@router.post("/assess-risk", response_model=AssessRiskOut)
async def assess_risk(
    body: AssessRiskIn, background: BackgroundTasks, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> AssessRiskOut:
    return await reply_first(background, lambda: voice_service.assess_risk(s, body, t))


@router.post("/read-summary", response_model=ReadSummaryOut)
def read_summary(body: ReadSummaryIn, s: Session = Depends(get_session), t: datetime = Depends(now)) -> ReadSummaryOut:
    return voice_service.read_summary(s, body, t)


@router.post("/record-update", response_model=PendingOut)
async def record_update(
    body: RecordUpdateIn, background: BackgroundTasks, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> PendingOut:
    return await reply_first(background, lambda: update_service.record_update(s, body, t))


@router.post("/confirm-update", response_model=ConfirmOut)
async def confirm_update(
    body: ConfirmIn, background: BackgroundTasks, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> ConfirmOut:
    return await reply_first(background, lambda: update_service.confirm_update(s, body, t))


@router.post("/onboarding-save", response_model=PendingOut)
async def onboarding_save(
    body: OnboardingSaveIn, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> PendingOut:
    return await onboarding_service.onboarding_save(s, body, t)


@router.post("/find-facility", response_model=FindFacilityOut)
def find_facility(
    body: FindFacilityIn, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> FindFacilityOut:
    return voice_service.find_facility(s, body, t)

"""/api/* write endpoints: ticket ack/reached, outbound calls, onboarding photo."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlmodel import Session

from app.api.deps import now
from app.db.session import get_session
from app.repositories import mothers as mrepo
from app.schemas.api import PhotoOut, PlaceCallIn, PlaceCallOut, TicketActionIn, TicketOut
from app.services import call_service, onboarding_service, ticket_service
from app.services.serializers import ticket_out

router = APIRouter(prefix="/api", tags=["actions"])


@router.post("/tickets/{ticket_id}/ack", response_model=TicketOut)
def ack(
    ticket_id: str, body: TicketActionIn, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> TicketOut:
    return ticket_out(s, ticket_service.acknowledge(s, ticket_id, body.by, body.note, t))


@router.post("/tickets/{ticket_id}/reached", response_model=TicketOut)
def reached(
    ticket_id: str, body: TicketActionIn, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> TicketOut:
    return ticket_out(s, ticket_service.mark_reached(s, ticket_id, body.by, body.note, t))


@router.post("/calls", response_model=PlaceCallOut)
async def place_call(body: PlaceCallIn, s: Session = Depends(get_session), t: datetime = Depends(now)) -> PlaceCallOut:
    call = await call_service.place_call(s, mrepo.get_mother(s, body.mother_id), body.purpose, t)
    return PlaceCallOut(interaction_id=call.interaction_id)


@router.post("/onboarding/photo", response_model=PhotoOut)
async def onboarding_photo(
    file: UploadFile = File(...), phone: str = Form(...), s: Session = Depends(get_session), t: datetime = Depends(now),
) -> PhotoOut:  # fmt: skip
    content = await file.read()
    return await onboarding_service.submit_photo(s, phone, file.filename or "slip.jpg", content,
                                                 file.content_type or "image/jpeg", t)  # fmt: skip


@router.get("/onboarding/photo/{job_id}", response_model=PhotoOut)
async def onboarding_photo_status(
    job_id: str, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> PhotoOut:
    return await onboarding_service.poll_photo(s, job_id, t)

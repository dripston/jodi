"""/api/* write endpoints: ticket ack/reached, outbound calls, onboarding photo."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from sqlmodel import Session

from app.api.deps import now
from app.core.time import iso
from app.db.session import get_session
from app.repositories import mothers as mrepo
from app.schemas.api import (
    MotherDetail,
    OkOut,
    PhotoOut,
    PlaceCallIn,
    PlaceCallOut,
    RegisterIn,
    ShareCreateIn,
    ShareOut,
    ShareSessionOut,
    ShareVerifyIn,
    TicketActionIn,
    TicketOut,
)
from app.services import call_service, onboarding_service, share_service, ticket_service
from app.services.serializers import baby_out, mother_out, ticket_out

router = APIRouter(prefix="/api", tags=["actions"])


@router.post("/tickets/{ticket_id}/ack", response_model=TicketOut)
def ack(
    ticket_id: str, body: TicketActionIn, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> TicketOut:
    return ticket_out(s, ticket_service.acknowledge(s, ticket_id, body.by, body.note, t))


@router.post("/tickets/{ticket_id}/reached", response_model=TicketOut)
async def reached(
    ticket_id: str, body: TicketActionIn, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> TicketOut:
    ticket = ticket_service.mark_reached(s, ticket_id, body.by, body.note, t)
    await share_service.create(s, ticket.mother_id, f"dashboard:{body.by}", t, ticket_id=ticket.id)  # link + code
    return ticket_out(s, ticket)


@router.post("/mothers/{mother_id}/share", response_model=ShareOut)
async def share_create(
    mother_id: str, body: ShareCreateIn, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> ShareOut:
    g = await share_service.create(s, mother_id, body.by, t)
    return ShareOut(url=share_service.share_url(g.token), expires_at=iso(g.expires_at) or "")


@router.post("/share/{token}/code", response_model=OkOut)
async def share_resend(token: str, s: Session = Depends(get_session), t: datetime = Depends(now)) -> OkOut:
    await share_service.resend_code(s, token, t)
    return OkOut()


@router.post("/share/{token}/verify", response_model=ShareSessionOut)
async def share_verify(
    token: str, body: ShareVerifyIn, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> ShareSessionOut:
    session, until = await share_service.verify(s, token, body.code, t)
    return ShareSessionOut(session=session, expires_at=iso(until) or "")


@router.get("/share/{token}/record")
async def share_record(
    token: str,
    x_share_session: str = Header(default=""),
    s: Session = Depends(get_session),
    t: datetime = Depends(now),
) -> dict[str, object]:
    """Read-only record for the doctor (header X-Share-Session from /verify)."""
    return await share_service.record(s, token, x_share_session, t)


@router.post("/share/{token}/revoke", response_model=OkOut)
def share_revoke(token: str, s: Session = Depends(get_session)) -> OkOut:
    share_service.revoke(s, token)
    return OkOut()


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


@router.post("/onboarding/register", response_model=MotherDetail)
async def onboarding_register(
    body: RegisterIn, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> MotherDetail:
    m = await onboarding_service.register(s, body, t)
    baby = mrepo.baby_of(s, m.id)
    return MotherDetail(mother=mother_out(s, m, t), baby=baby_out(baby) if baby else None)


@router.get("/onboarding/photo/{job_id}", response_model=PhotoOut)
async def onboarding_photo_status(
    job_id: str, s: Session = Depends(get_session), t: datetime = Depends(now)
) -> PhotoOut:
    return await onboarding_service.poll_photo(s, job_id, t)

"""/api/* read endpoints for the frontend (contracts §6, §6.1)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.api.deps import now
from app.core.time import day_since_delivery
from app.db.session import get_session
from app.domain.facts import Fact
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.schemas.api import (
    AshaListItem,
    AshaOut,
    AuditOut,
    CallDetail,
    CallLogOut,
    EntryOut,
    FacilityOptionsOut,
    FactOut,
    MotherDetail,
    MotherOut,
    OutboundMessageOut,
    PlannedCallOut,
    RecentCall,
    StatsOut,
    StatusByDay,
    SummaryOut,
    TicketOut,
    VitalsOut,
)
from app.services import asha_service, record_service, stats_service
from app.services.serializers import asha_out, baby_out, call_out, entry_out, mother_out, ticket_out

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@router.get("/mothers", response_model=list[MotherOut])
def list_mothers(
    status: str | None = None, asha_id: str | None = None, high_risk: bool | None = None,
    q: str | None = None, day_min: int | None = None, day_max: int | None = None,
    s: Session = Depends(get_session), t: datetime = Depends(now),
) -> list[MotherOut]:  # fmt: skip
    out = []
    for m in mrepo.list_mothers(s):
        if m.delivery_date is None:
            continue  # stub created by a photo upload, not enrolled until onboarding is confirmed
        day = day_since_delivery(m.delivery_date, t)
        if (status and m.status != status) or (asha_id and m.asha_id != asha_id):
            continue
        if high_risk is not None and (m.risk_profile == "high") != high_risk:
            continue
        if q and q.lower() not in m.name.lower() and q not in m.phone:
            continue
        if (day_min is not None and (day is None or day < day_min)) or (
            day_max is not None and (day is None or day > day_max)
        ):
            continue
        out.append(mother_out(s, m, t, embed=True))
    return out


@router.get("/mothers/{mother_id}", response_model=MotherDetail)
def get_mother(mother_id: str, s: Session = Depends(get_session), t: datetime = Depends(now)) -> MotherDetail:
    m = mrepo.get_mother(s, mother_id)
    baby = mrepo.baby_of(s, m.id)
    return MotherDetail(mother=mother_out(s, m, t, embed=True), baby=baby_out(baby) if baby else None)


@router.get("/mothers/{mother_id}/timeline", response_model=list[EntryOut])
def timeline(
    mother_id: str, since: str | None = Query(default=None), s: Session = Depends(get_session)
) -> list[EntryOut]:
    mrepo.get_mother(s, mother_id)
    fired = rrepo.rule_ids_by_interaction(s, mother_id)
    return [entry_out(e, fired) for e in rrepo.timeline(s, mother_id, since)]


@router.get("/mothers/{mother_id}/audit", response_model=AuditOut)
def audit(mother_id: str, s: Session = Depends(get_session)) -> AuditOut:
    v = record_service.verify(s, mother_id)
    return AuditOut(valid=v.valid, entries=v.entries, broken_at=v.broken_at, broken_entry_id=v.broken_entry_id)


@router.get("/mothers/{mother_id}/vitals", response_model=VitalsOut)
def vitals(mother_id: str, s: Session = Depends(get_session)) -> VitalsOut:
    mrepo.get_mother(s, mother_id)
    return VitalsOut(**record_service.vitals(s, mother_id))  # type: ignore[arg-type]


@router.get("/mothers/{mother_id}/summary", response_model=SummaryOut)
def summary(mother_id: str, s: Session = Depends(get_session), t: datetime = Depends(now)) -> SummaryOut:
    return SummaryOut(summary_text=record_service.summary_text(s, mrepo.get_mother(s, mother_id), t))


@router.get("/mothers/{mother_id}/calls", response_model=list[CallLogOut])
def mother_calls(mother_id: str, s: Session = Depends(get_session)) -> list[CallLogOut]:
    mrepo.get_mother(s, mother_id)
    return [call_out(c) for c in rrepo.recent_calls(s, 200, mother_id)]


@router.get("/mothers/{mother_id}/planned-calls", response_model=list[PlannedCallOut])
def planned_calls(mother_id: str, s: Session = Depends(get_session)) -> list[PlannedCallOut]:
    """Jodi's scheduled calls for her (milestone days, rechecks, retries), oldest first."""
    from sqlmodel import col, select

    from app.core.time import iso
    from app.db.models import ScheduledCall

    mrepo.get_mother(s, mother_id)
    q = select(ScheduledCall).where(ScheduledCall.mother_id == mother_id).order_by(col(ScheduledCall.due_at))
    return [
        PlannedCallOut(id=c.id, day=c.day, due_at=iso(c.due_at), purpose=c.purpose, reason=c.reason, status=c.status)
        for c in s.exec(q)
    ]


@router.get("/mothers/{mother_id}/facilities", response_model=FacilityOptionsOut)
def mother_facilities(
    mother_id: str, need: str | None = None, limit: int = 5, s: Session = Depends(get_session)
) -> FacilityOptionsOut:
    """Ranked hospitals for her. `need` defaults from her open ticket (mother red → emergency_mother,
    baby red → emergency_baby, both → emergency), else routine_checkup."""
    from app.services import facility_service

    m = mrepo.get_mother(s, mother_id)
    return facility_service.options_for(s, m, need, limit)


@router.get("/mothers/{mother_id}/messages", response_model=list[OutboundMessageOut])
def mother_messages(mother_id: str, s: Session = Depends(get_session)) -> list[OutboundMessageOut]:
    """Telegram messages sent about this mother (e.g. "Telegram sent to husband ✓")."""
    from app.core.time import iso
    from app.services.telegram_send import messages_for

    mrepo.get_mother(s, mother_id)
    return [OutboundMessageOut(id=m.id, kind=m.kind, chat_role=m.chat_role, text=m.text, sent_at=iso(m.sent_at),
                               delivered=m.delivered, ticket_id=m.ticket_id) for m in messages_for(s, mother_id)]  # fmt: skip


@router.get("/tickets", response_model=list[TicketOut])
def tickets(state: str | None = None, s: Session = Depends(get_session)) -> list[TicketOut]:
    return [ticket_out(s, t) for t in rrepo.tickets(s, state)]


@router.get("/asha/{asha_id}/list", response_model=list[AshaListItem])
def asha_list(asha_id: str, s: Session = Depends(get_session), t: datetime = Depends(now)) -> list[AshaListItem]:
    out = []
    for m, prio, reason, tid in asha_service.priority_list(s, asha_id, t):
        baby = mrepo.baby_of(s, m.id)
        out.append(AshaListItem(mother=mother_out(s, m, t), baby=baby_out(baby) if baby else None,
                                priority=prio, reason=reason, ticket_id=tid))  # fmt: skip
    return out


@router.get("/ashas", response_model=list[AshaOut])
def ashas(s: Session = Depends(get_session)) -> list[AshaOut]:
    return [asha_out(a, len(mrepo.open_asha_tasks(s, a.id))) for a in mrepo.list_ashas(s)]


@router.get("/calls/recent", response_model=list[RecentCall])
def recent_calls(s: Session = Depends(get_session)) -> list[RecentCall]:
    return [RecentCall(interaction_id=c.interaction_id, mother_id=c.mother_id, purpose=c.purpose,
                       started_at=call_out(c).started_at, answered=c.answered, summary=c.summary)
            for c in rrepo.recent_calls(s, 40) if c.mother_id][:20]  # fmt: skip


@router.get("/calls/{interaction_id:path}", response_model=CallDetail)  # Sarvam ids contain "/"
def call_detail(interaction_id: str, s: Session = Depends(get_session)) -> CallDetail:
    c = rrepo.get_call(s, interaction_id)
    a = rrepo.assessment_for_interaction(s, interaction_id)
    facts = [FactOut(**Fact.from_dict(f).to_dict()) for f in (a.facts if a else [])]
    from app.db.models import Mother
    from app.domain.transcript import display_turns
    from app.schemas.api import TurnOut

    mother = s.get(Mother, c.mother_id) if c.mother_id else None
    caller = {"mother": mother.name if mother else "Mother", "family": "Family", "asha": "ASHA",
              "doctor": "Doctor"}.get(c.caller_role or "", "Caller")  # fmt: skip
    turns = [TurnOut(role=x["role"], speaker="Jodi" if x["role"] == "agent" else caller, text=x["text"], en=x["en"])  # type: ignore[arg-type]
             for x in display_turns(c.transcript or "")]  # fmt: skip
    plain = "\n".join(f"{t.speaker}: {t.en or t.text}" for t in turns)
    return CallDetail(call=call_out(c), transcript=plain or (c.transcript or ""), facts=facts,
                      rule_ids=list(a.rule_ids) if a else [], turns=turns)  # fmt: skip


@router.get("/stats", response_model=StatsOut)
def stats(s: Session = Depends(get_session), t: datetime = Depends(now)) -> StatsOut:
    return StatsOut(**stats_service.stats(s, t))


@router.get("/stats/status-by-day", response_model=list[StatusByDay])
def status_by_day(s: Session = Depends(get_session), t: datetime = Depends(now)) -> list[StatusByDay]:
    return [StatusByDay(**r) for r in stats_service.status_by_day(s, t)]

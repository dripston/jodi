"""DB rows → API schemas (contracts §2)."""

from __future__ import annotations

from datetime import datetime

from sqlmodel import Session

from app.core.time import day_since_delivery, iso
from app.db.models import Asha, Baby, CallLog, Entry, Mother, Ticket
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.schemas.api import (
    AshaOut,
    BabyOut,
    CallLogOut,
    EntryOut,
    FamilyPhone,
    MotherOut,
    TicketHistoryItem,
    TicketOut,
)


def baby_out(b: Baby) -> BabyOut:
    return BabyOut(id=b.id, mother_id=b.mother_id, name=b.name, birth_weight_grams=b.birth_weight_grams,
                   gestation_weeks=b.gestation_weeks, status=b.status)  # type: ignore[arg-type]  # fmt: skip


def mother_out(s: Session, m: Mother, now: datetime, embed: bool = False) -> MotherOut:
    fam = [FamilyPhone(name=f.name, relation=f.relation, phone=f.phone, decision_maker=f.decision_maker)
           for f in mrepo.family_of(s, m.id)]  # fmt: skip
    out = MotherOut(
        id=m.id, name=m.name, phone=m.phone, family_phones=fam, language=m.language,
        delivery_date=m.delivery_date.isoformat() if m.delivery_date else None,
        delivery_type=m.delivery_type, complications=list(m.complications), risk_profile=m.risk_profile,
        asha_id=m.asha_id, consent_at=iso(m.consent_at), status=m.status,  # type: ignore[arg-type]
        day_since_delivery=day_since_delivery(m.delivery_date, now) if m.delivery_date else None,
    )  # fmt: skip
    if embed:
        baby = mrepo.baby_of(s, m.id)
        out.baby = baby_out(baby) if baby else None
        last = next((c for c in rrepo.recent_calls(s, 20, m.id) if c.answered and c.purpose == "checkin"), None)
        out.last_checkin_at = iso(last.started_at) if last else None
        pending = rrepo.pending_scheduled(s, m.id)
        out.next_call_at = iso(pending[0].due_at) if pending else None
    return out


def entry_out(e: Entry) -> EntryOut:
    return EntryOut(**e.model_dump(exclude={"seq"}))  # type: ignore[arg-type]


def entry_hash_body(e: Entry) -> dict[str, object]:
    return e.model_dump(exclude={"seq"})


def ticket_out(s: Session, t: Ticket) -> TicketOut:
    history = [TicketHistoryItem(at=iso(ev.at) or "", state=ev.state, by=ev.by, note=ev.note)
               for ev in rrepo.ticket_events(s, t.id)]  # fmt: skip
    return TicketOut(
        id=t.id, mother_id=t.mother_id, subjects=list(t.subjects), level=t.level,  # type: ignore[arg-type]
        rule_ids=list(t.rule_ids), state=t.state, reason_text=t.reason_text,
        dismissed_by_family=t.dismissed_by_family, history=history,
        next_escalation_at=iso(t.next_escalation_at), assigned_to=list(t.assigned_to),
    )  # fmt: skip


def asha_out(a: Asha, open_tasks: int | None = None) -> AshaOut:
    return AshaOut(id=a.id, name=a.name, phone=a.phone, village=a.village, open_tasks=open_tasks)


def call_out(c: CallLog) -> CallLogOut:
    return CallLogOut(interaction_id=c.interaction_id, mother_id=c.mother_id, purpose=c.purpose,
                      direction=c.direction, started_at=iso(c.started_at), duration_seconds=c.duration_seconds,
                      answered=c.answered, outcome=c.outcome, summary=c.summary)  # fmt: skip

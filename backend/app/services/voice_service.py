"""Sarvam hooks and tools orchestration (contracts §4)."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any

from sqlmodel import Session

from app.core.logging import log
from app.core.time import day_since_delivery, ensure_utc, ist_today, to_ist
from app.db.models import AccessLog, CallLog, Mother, ProcessedInteraction
from app.domain import access
from app.domain import facilities as fac
from app.domain.labels import describe_facts, join_words
from app.domain.transcript import caller_text
from app.domain.updates import onboarding_summary
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.schemas.api import (
    AssessRiskIn,
    AssessRiskOut,
    FindFacilityIn,
    FindFacilityOut,
    OnEndIn,
    OnStartIn,
    OnStartOut,
    ReadSummaryIn,
    ReadSummaryOut,
)
from app.services import (
    asha_service,
    assessment_service,
    call_service,
    onboarding_service,
    record_service,
    ticket_service,
)

logger = logging.getLogger(__name__)
_AFFIRM = re.compile(r"(?<!\w)(yes|haudu|houdu|haan|haa|sari|okay|ok|confirm(ed)?|on it)(?!\w)", re.IGNORECASE)


# ------------------------------------------------------------------ identity
def identify(s: Session, phone: str | None) -> access.CallerIdentity:
    if not phone:
        return access.CallerIdentity("unknown")
    mothers, ashas = mrepo.contacts_directory(s)
    return access.resolve_caller(phone, mothers, ashas)


def mother_for_call(s: Session, call: CallLog | None, ident: access.CallerIdentity) -> Mother | None:
    if call and call.mother_id:
        return mrepo.get_mother(s, call.mother_id)
    if ident.role in ("mother", "family") and ident.mother_ids:
        return mrepo.get_mother(s, ident.mother_ids[0])
    return None


def focus_topics(m: Mother, day: int) -> str:
    mother = ["bleeding", "headache"]
    if m.delivery_type == "c_section":
        mother.append("stitches")
    if any("bp" in c or "eclampsia" in c or "hypertension" in c for c in m.complications):
        mother.append("BP medicine")
    mother.append("fever")
    baby = ["baby feeding"]
    if 2 <= day <= 5:
        baby.append("jaundice (day 3-5)")
    baby += ["breathing", "warmth"]
    if day <= 10:
        baby.append("cord")
    if day > 5:
        baby.append("wet nappies")
    return f"{', '.join(mother)}; {', '.join(baby)}"


def _next_call_day(s: Session, m: Mother) -> str:
    pending = [p for p in rrepo.pending_scheduled(s, m.id) if p.day is not None]
    return str(pending[0].day) if pending else ""


# ------------------------------------------------------------------ on-start
def on_start(s: Session, body: OnStartIn, now: datetime) -> OnStartOut:
    phone = body.phone or ""
    call = call_service.bind_on_start(s, body.interaction_id, phone, body.direction, now)
    phone = phone or call.phone or ""
    ident = identify(s, phone)
    mother = mother_for_call(s, call, ident)
    role = call.caller_role if call.mother_id else ident.role
    awaiting_own_consent = (
        mother is not None and role == "mother" and mother.onboarded_at is not None and mother.consent_at is None
    )
    # Onboarding (intro + her own consent) happens only on a call Jodi places. When SHE calls in, it may
    # be an emergency: no intro, straight to "what is happening?" (inbound playbook).
    outbound = call.direction == "outbound"
    if awaiting_own_consent and outbound:
        purpose = "onboarding"  # registered on the dashboard or by family on Telegram: her consent comes first
    elif call.mother_id:
        purpose = call.purpose
    elif ident.role == "asha":
        purpose = "asha"
    elif ident.role == "mother" and mother and mother.onboarded_at is None and outbound:
        purpose = "onboarding"
    else:
        purpose = "inbound"
    call.phone, call.caller_role, call.purpose = phone or None, role, purpose
    call.mother_id = mother.id if mother else None
    call.language = mother.language if mother else "kn"
    s.commit()
    if role == "asha" and ident.asha_id:
        return _asha_context(s, ident.asha_id, now)
    if mother is None or role == "unknown":
        return OnStartOut(caller_role="unknown", call_purpose=purpose, language="kn", mother_name="",
                          day_since_delivery="", delivery_type="", baby_age_days="", focus_topics="",
                          last_summary="", open_ticket="none", asha_patient_list="")  # fmt: skip
    return _mother_context(s, mother, role, purpose, now)


def previous_symptoms(s: Session, m: Mother, now: datetime, days: int = 14, limit: int = 5) -> str:
    """Symptoms she reported recently (newest first, one per sign), e.g. "severe headache (yesterday)".
    Only present symptoms ("no fever" is skipped); vitals and medicines are not symptoms."""
    since, today = now - timedelta(days=days), ist_today(now)
    seen: set[str] = set()
    items: list[str] = []
    for e in reversed(rrepo.entries_in_order(s, m.id)):
        if e.kind != "symptom" or not e.code or not e.value or e.value.startswith("no ") or e.code in seen:
            continue
        created = ensure_utc(datetime.fromisoformat(e.created_at))
        if created < since:
            continue
        seen.add(e.code)
        ago = (today - to_ist(created).date()).days
        when = "today" if ago <= 0 else "yesterday" if ago == 1 else f"{ago} days ago"
        items.append(f"{e.value} ({when})")
        if len(items) == limit:
            break
    return "; ".join(items)


def _mother_context(s: Session, m: Mother, role: str, purpose: str, now: datetime) -> OnStartOut:
    day = day_since_delivery(m.delivery_date, now) if m.delivery_date else 0
    last = next((c.summary for c in rrepo.recent_calls(s, 20, m.id) if c.summary), "")
    symptoms = previous_symptoms(s, m, now)
    # Jodi asks about each recently reported symptom (better / same / worse) on her next call.
    parts = ([f"Recently reported symptoms: {symptoms}."] if symptoms else []) + (
        [f"Last call: {last}"] if last else []
    )
    last = " ".join(parts)
    if purpose == "onboarding" and onboarding_service.is_registered_awaiting_consent(m):
        known = onboarding_summary(onboarding_service.registered_fields(s, m))
        last = (f"Already registered from her discharge slip and her ASHA: {known}. Do NOT ask for these details "
                "again; read them back once with onboarding_save for her confirmation and consent.")  # fmt: skip
    t = rrepo.active_ticket(s, m.id)
    return OnStartOut(
        caller_role=role, call_purpose=purpose, language=m.language, mother_name=m.name,
        day_since_delivery=str(day), delivery_type=m.delivery_type or "", baby_age_days=str(day),
        focus_topics=focus_topics(m, day), last_summary=last,
        open_ticket=f"{t.level}: {t.reason_text}" if t else "none", asha_patient_list="",
        next_call_day=_next_call_day(s, m), previous_symptoms=symptoms,
    )  # fmt: skip


def _asha_context(s: Session, asha_id: str, now: datetime) -> OnStartOut:
    return OnStartOut(caller_role="asha", call_purpose="asha", language="kn", mother_name="",
                      day_since_delivery="", delivery_type="", baby_age_days="", focus_topics="",
                      last_summary="", open_ticket="none",
                      asha_patient_list=asha_service.spoken_list(s, asha_id, now))  # fmt: skip


# ---------------------------------------------------------------- assess-risk
async def assess_risk(s: Session, body: AssessRiskIn, now: datetime) -> AssessRiskOut:
    call = rrepo.call_log(s, body.interaction_id)
    phone = body.phone or (call.phone if call else "") or ""
    ident = identify(s, phone)
    mother = mother_for_call(s, call, ident)
    role = (call.caller_role if call and call.mother_id else ident.role) if mother else "unknown"
    purpose = call.purpose if call else "inbound"
    r = await assessment_service.assess_transcript(
        s, mother=mother, caller_role=role, caller_phone=phone or None, interaction_id=body.interaction_id,
        transcript=body.transcript, now=now, live=True, purpose=purpose, language=body.language,
    )  # fmt: skip
    if purpose == "family_alert" and mother is not None:
        maybe_family_ack(s, mother, body.transcript, phone, now, require_script=True,
                         interaction_id=body.interaction_id)  # fmt: skip
    return AssessRiskOut(level=r.level, rule_ids=r.rule_ids, say_verbatim=r.say_verbatim,  # type: ignore[arg-type]
                         transfer_to=r.transfer_to, clarify_question=r.clarify_question,
                         ticket_id=r.ticket.id if r.ticket else None)  # fmt: skip


def maybe_family_ack(s: Session, mother: Mother, transcript: str, phone: str, now: datetime,
                     require_script: bool, interaction_id: str) -> bool:  # fmt: skip
    """FAMILY-ALERT asks the family to say 'yes' → acknowledge the ticket."""
    t = rrepo.active_ticket(s, mother.id)
    if t is None or t.state not in ("open", "notified"):
        return False
    if require_script:
        row = rrepo.assessment_for_interaction(s, interaction_id)
        if not row or "FAMILY-ALERT" not in row.scripts:
            return False
    from app.integrations.lexicon_extractor import DISMISSAL

    text = caller_text(transcript)
    last_turn = text.splitlines()[-1] if text else ""
    if _AFFIRM.search(last_turn) and not DISMISSAL.search(last_turn):
        ticket_service.acknowledge(s, t.id, phone or "family", "family confirmed on FAMILY-ALERT call", now)
        return True
    return False


# -------------------------------------------------------------------- on-end
def _call_summary(mother: Mother | None, result: assessment_service.PipelineResult | None, now: datetime) -> str:
    if mother is None or result is None:
        return ""
    day = day_since_delivery(mother.delivery_date, now) if mother.delivery_date else None
    present = [f for f in result.extracted.facts if f.present]
    m = join_words(describe_facts([f for f in present if f.subject == "mother"]))
    b = join_words(describe_facts([f for f in present if f.subject == "baby"]))
    said = "; ".join(x for x in (m, b) if x) or "nothing of concern reported"
    prefix = f"Day {day}: " if day is not None else ""
    return f"{prefix}{said}. Level {result.level}."


async def on_end(s: Session, body: OnEndIn, now: datetime) -> dict[str, object]:
    done = s.get(ProcessedInteraction, body.interaction_id)
    if done:
        return dict(done.result)
    call = rrepo.call_log(s, body.interaction_id) or call_service.bind_on_start(
        s, body.interaction_id, body.phone or "", None, now)  # fmt: skip
    phone = body.phone or call.phone or ""
    ident = identify(s, phone)
    mother = mother_for_call(s, call, ident)
    role = call.caller_role if call.mother_id else ident.role
    call.duration_seconds, call.transcript, call.status = body.duration_seconds, body.transcript, "ended"
    call.answered = body.answered
    result: assessment_service.PipelineResult | None = None
    if not body.answered:
        call.outcome = "no_answer"
        await call_service.handle_missed(s, call, now)
    else:
        call_service.mark_answered(s, call)
        if mother is not None and role in ("mother", "family"):
            result = await assessment_service.assess_transcript(
                s, mother=mother, caller_role=role, caller_phone=phone or None,
                interaction_id=body.interaction_id, transcript=body.transcript, now=now, live=False,
                purpose=call.purpose, language=call.language,
            )  # fmt: skip
            if call.purpose == "family_alert":
                maybe_family_ack(s, mother, body.transcript, phone, now, False, body.interaction_id)
        call.outcome = body.outcome() or _outcome(result)
        call.summary = _call_summary(mother, result, now)
        if mother is not None and result is not None and result.level == "green" and call.purpose == "checkin":
            from app.services import telegram_alerts

            await telegram_alerts.notify_status_green(s, mother, now)
    out = {"ok": True, "level": result.level if result else None}
    s.add(ProcessedInteraction(interaction_id=body.interaction_id, kind="on_end", result=out, created_at=now))
    s.commit()
    log(logger, "on-end processed", interaction_id=body.interaction_id, answered=body.answered,
        risk_level=out["level"])  # fmt: skip
    return out


MISSED_STATUSES = frozenset({"no_answer", "busy", "failed"})


def _bind_webhook_call(s: Session, attempt_id: str, real_iid: str | None) -> CallLog | None:
    call = rrepo.call_by_attempt(s, attempt_id) if attempt_id else None
    if call is None or not real_iid or call.interaction_id == real_iid:
        return call
    existing = rrepo.call_log(s, real_iid)
    if existing is None:
        call.interaction_id = real_iid
        s.commit()
        return call
    for attr in ("mother_id", "caller_role", "scheduled_call_id", "attempt_id"):
        if getattr(call, attr) and not getattr(existing, attr):
            setattr(existing, attr, getattr(call, attr))
    existing.purpose, existing.direction = call.purpose, "outbound"
    call.status = "merged"
    s.commit()
    return existing


async def sarvam_webhook(s: Session, p: dict[str, Any], now: datetime) -> dict[str, object]:
    """Map Sarvam's webhook payload (instant-outbound/webhook-payload) onto the on-end pipeline."""
    status = str(p.get("status") or "").lower()
    attempt_id = str(p.get("attempt_id") or "")
    real_iid = str(p["interaction_id"]) if p.get("interaction_id") else None
    call = _bind_webhook_call(s, attempt_id, real_iid)
    iid = real_iid or (call.interaction_id if call else attempt_id)
    if not iid:
        return {"ok": True}
    transcript = p.get("interaction_transcript") or p.get("transcript") or ""
    body = OnEndIn(
        phone=str(p.get("user_phone_number") or (call.phone if call else "") or ""),
        interaction_id=iid,
        transcript=json.dumps(transcript, ensure_ascii=False) if isinstance(transcript, list) else str(transcript),
        duration_seconds=p.get("duration"),
        variables=p.get("final_agent_variables") or {},
        answered=status not in MISSED_STATUSES,
    )
    return await on_end(s, body, now)


def _outcome(r: assessment_service.PipelineResult | None) -> str:
    if r is None:
        return "completed"
    return {"red": "red_flag", "amber": "amber_flag"}.get(r.level, "completed")


# --------------------------------------------------------------- read-summary
def read_summary(s: Session, body: ReadSummaryIn, now: datetime) -> ReadSummaryOut:
    from app.services.assessment_service import script_book

    ident = identify(s, body.caller_phone)
    mother: Mother | None = None
    if ident.role in ("mother", "family") and ident.mother_ids:
        mother = mrepo.get_mother(s, ident.mother_ids[0])
    elif ident.role == "asha" and body.about_mother_phone:
        mother = mrepo.mother_by_phone(s, body.about_mother_phone)
    allowed = ident.role == "asha" and mother is None and ident.asha_id is not None
    if mother is not None:
        allowed = access.can_read_mother(ident, mother.id)
    s.add(AccessLog(who=body.caller_phone, when=now, mother_id=mother.id if mother else None,
                    interaction_id=body.interaction_id, allowed=allowed,
                    scope=access.read_permission(ident.role) if allowed else "none"))  # fmt: skip
    s.commit()
    if not allowed:
        text, _ = script_book().get("NOT-ALLOWED", "en")
        return ReadSummaryOut(allowed=False, summary_text=text)
    if mother is None and ident.asha_id:
        return ReadSummaryOut(allowed=True, summary_text=asha_service.spoken_list(s, ident.asha_id, now))
    assert mother is not None
    scope = "full" if access.read_permission(ident.role) == access.READ_FULL else "status"
    return ReadSummaryOut(allowed=True, summary_text=record_service.summary_text(s, mother, now, scope))


# -------------------------------------------------------------- find-facility
def find_facility(s: Session, body: FindFacilityIn, now: datetime) -> FindFacilityOut:
    ident = identify(s, body.mother_phone)
    mother = mrepo.get_mother(s, ident.mother_ids[0]) if ident.mother_ids and ident.role != "asha" else None
    if mother is None:
        mother = mrepo.mother_by_phone(s, body.mother_phone)
    lat, lng = (mother.lat, mother.lng) if mother else (12.97, 77.59)
    infos = [fac.FacilityInfo(f.id, f.name, f.type, frozenset(f.services), f.lat, f.lng, f.cost_band, f.open_24x7,
                              f.availability)
             for f in mrepo.list_facilities(s)]  # fmt: skip
    ranked = fac.rank(infos, body.need, lat, lng)
    if not ranked:
        return FindFacilityOut(facility_id=None, say_text="Please call 108.", distance_km=None)
    best, dist = ranked[0]
    return FindFacilityOut(facility_id=best.id, say_text=fac.say_text(best, dist), distance_km=round(dist, 1))

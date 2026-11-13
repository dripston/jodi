"""Transcript → safety net → extraction → rules → record + assessment + ticket → fixed script.

Brief §5.1. Safety net runs first and independently of the LLM; if extraction fails the
net still decides, and the caller is asked to repeat (never a guessed fact).
"""

from __future__ import annotations

import hashlib
import logging
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime
from functools import lru_cache
from typing import Any

from sqlmodel import Session

from app.core.config import get_settings
from app.core.logging import log
from app.core.time import day_since_delivery, ist_today
from app.db.models import Assessment, Entry, Mother, Ticket
from app.domain import facilities as fac
from app.domain import rules, safety_net
from app.domain.facts import Fact, validate_facts
from app.domain.labels import DEFAULT_CLARIFY, clarify_question
from app.domain.rules import AssessmentInput, Profile
from app.domain.script_choice import choose_scripts
from app.domain.scripts import ScriptBook
from app.domain.transcript import spoken_language
from app.integrations.registry import get_integrations
from app.integrations.sarvam_llm import ExtractionError
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.services import call_service, record_service, ticket_service
from app.services.status import refresh_status

logger = logging.getLogger(__name__)
_CACHE: OrderedDict[tuple[str, str], dict[str, Any]] = OrderedDict()
_CACHE_MAX = 256


@lru_cache
def script_book() -> ScriptBook:
    return ScriptBook.load(get_settings().docs_dir / "red-scripts.md")


@dataclass
class Extracted:
    facts: list[Fact] = field(default_factory=list)
    unclear_codes: list[str] = field(default_factory=list)
    dismissal: bool = False
    failed: bool = False


@dataclass
class PipelineResult:
    assessment: rules.Assessment
    level: str
    rule_ids: list[str]
    say_verbatim: str | None
    script_ids: list[str]
    transfer_to: str | None
    clarify_question: str | None
    ticket: Ticket | None
    entries: list[Entry]
    extracted: Extracted


def profile_for(s: Session, mother: Mother | None, now: datetime) -> Profile:
    if mother is None or mother.delivery_date is None:
        return Profile()
    day = day_since_delivery(mother.delivery_date, now)
    return Profile(tuple(mother.complications), day, float(day * 24))


async def extract(transcript: str, interaction_id: str, context: str) -> Extracted:
    key = (interaction_id, hashlib.sha256(transcript.encode("utf-8")).hexdigest())
    raw = _CACHE.get(key)
    if raw is None:
        try:
            raw = await get_integrations().extractor.extract(transcript, context)
        except ExtractionError:
            return Extracted(failed=True)
        _CACHE[key] = raw
        if len(_CACHE) > _CACHE_MAX:
            _CACHE.popitem(last=False)
    v = validate_facts(list(raw.get("facts") or []))
    if v.dropped:
        log(logger, "dropped unknown fact codes", logging.WARNING,
            codes=[d.get("code") for d in v.dropped], interaction_id=interaction_id)  # fmt: skip
    unclear = list(dict.fromkeys([*(f.code for f in v.unclear), *(raw.get("needs_clarification") or [])]))
    unclear = [c for c in unclear if c not in {f.code for f in v.facts}]
    return Extracted(v.facts, unclear, bool(raw.get("dismissal_detected")))


def _facility_name(s: Session, mother: Mother | None, a: rules.Assessment) -> str | None:
    if a.overall_level != "red":
        return None
    need = "emergency_mother" if a.mother_level == "red" else "emergency_baby"
    infos = [fac.FacilityInfo(f.id, f.name, f.type, frozenset(f.services), f.lat, f.lng, f.cost_band, f.open_24x7)
             for f in mrepo.list_facilities(s)]  # fmt: skip
    lat, lng = (mother.lat, mother.lng) if mother else (12.97, 77.59)
    ranked = fac.rank(infos, need, lat, lng) or fac.rank(infos, "emergency", lat, lng)
    return ranked[0][0].name if ranked else None


def render_scripts(script_ids: list[str], language: str, name: str | None, facility: str | None) -> str | None:
    if not script_ids:
        return None
    texts = []
    for sid in script_ids:
        text, used = script_book().render(sid, language, name, facility)
        if used != language:
            log(logger, "script language fallback", logging.WARNING, script=sid, wanted=language, used=used)
        texts.append(text)
    return " ".join(texts)


def _source_and_flags(role: str) -> tuple[str, list[str]]:
    from app.domain.access import source_for

    return source_for(role, None), (["unverified_caller"] if role == "unknown" else [])


def _upsert_assessment(s: Session, mother: Mother, interaction_id: str, a: rules.Assessment,
                       ex: Extracted, scripts: list[str], now: datetime) -> Assessment:  # fmt: skip
    row = rrepo.assessment_for_interaction(s, interaction_id) or Assessment(
        mother_id=mother.id, interaction_id=interaction_id, mother_level="green", baby_level="green",
        overall_level="green", rules_version=a.rules_version)  # fmt: skip
    row.mother_level, row.baby_level, row.overall_level = a.mother_level, a.baby_level, a.overall_level
    row.rule_ids, row.reason_text, row.rules_version = a.rule_ids, a.reason_text, a.rules_version
    row.dismissal_detected = ex.dismissal
    row.facts = [f.to_dict() for f in ex.facts]
    row.scripts = list(dict.fromkeys([*row.scripts, *scripts]))
    row.created_at = now
    s.add(row)
    s.commit()
    return row


def _schedule_recheck(s: Session, mother: Mother, a: rules.Assessment, now: datetime) -> None:
    from app.domain.scheduling import amber_recheck

    if a.overall_level == "amber" or a.recheck_hours:
        call_service.schedule(s, mother, amber_recheck(now, a.recheck_hours), now)


def _reminders(s: Session, mother: Mother, a: rules.Assessment, interaction_id: str, now: datetime) -> None:
    if "iron" in a.reminders:
        done = any(e.kind == "note" and e.code == "stopped_iron"
                   for e in rrepo.entries_for_interaction(s, interaction_id))  # fmt: skip
        if not done:
            record_service.append_entry(
                s, mother, subject="mother", kind="note", source="system", now=now, code="stopped_iron",
                value="Reminder (M-MED-02): iron tablets stopped; remind at next call",
                interaction_id=interaction_id)  # fmt: skip


async def assess_transcript(
    s: Session, *, mother: Mother | None, caller_role: str, caller_phone: str | None,
    interaction_id: str, transcript: str, now: datetime, live: bool, purpose: str = "checkin",
    language: str | None = None,
) -> PipelineResult:  # fmt: skip
    started = time.perf_counter()
    net = safety_net.check(transcript)
    profile = profile_for(s, mother, now)
    context = f"Day {profile.day_since_delivery} after delivery; speaker role: {caller_role}; call purpose: {purpose}."
    ex = await extract(transcript, interaction_id, context)

    prev = rrepo.previous_assessment(s, mother.id, interaction_id) if mother else None
    same = rrepo.assessment_for_interaction(s, interaction_id) if mother else None
    active_before = rrepo.active_ticket(s, mother.id) if mother else None
    a = rules.assess(AssessmentInput(
        facts=tuple(ex.facts), profile=profile,
        previous_rule_ids=frozenset(prev.rule_ids) if prev else frozenset(),
        consecutive_missed_calls=0, dismissal_detected=ex.dismissal,
        safety_net_subject=net.subject if net.fired else None,  # type: ignore[arg-type]
    ))  # fmt: skip

    entries: list[Entry] = []
    ticket: Ticket | None = None
    spoken = spoken_language(transcript)
    if mother is not None and caller_role == "mother" and spoken and mother.language != spoken:
        # Her latest spoken language becomes her language: the family-alert call, its script and
        # the next scheduled calls all follow it (set before the ticket places any call).
        log(logger, "mother language updated", mother_id=mother.id, old=mother.language, new=spoken)
        mother.language = spoken
    if mother is not None:
        source, flags = _source_and_flags(caller_role)
        entries = record_service.save_facts(s, mother, ex.facts, source=source, now=now,
                                            source_phone=caller_phone, interaction_id=interaction_id,
                                            flags=flags)  # fmt: skip
        ticket = await ticket_service.apply_assessment(s, mother, a, now, live)
        _reminders(s, mother, a, interaction_id, now)
        _schedule_recheck(s, mother, a, now)

    dismissal_is_new = ex.dismissal and not (same and same.dismissal_detected)
    flag_active = active_before is not None
    if dismissal_is_new and active_before is not None and a.overall_level == "green":
        ticket_service.mark_dismissed(s, active_before, now)
        s.commit()
    script_ids, level = choose_scripts(a, dismissal_is_new, flag_active), a.overall_level
    if dismissal_is_new and active_before is not None and level == "green":
        script_ids, level = ["DISMISSAL-RESPONSE"], active_before.level
    already = same.scripts if same else []
    if purpose == "family_alert" and not script_ids and ticket is not None and "FAMILY-ALERT" not in already:
        script_ids, level = ["FAMILY-ALERT"], ticket.level

    # What the caller actually spoke beats the (possibly stale) language variable Sarvam sends.
    lang = spoken or language or (mother.language if mother else "kn")
    say = render_scripts(script_ids, lang, mother.name if mother else None, _facility_name(s, mother, a))
    transfer = _transfer_to(s, mother, level, caller_phone, purpose, live)
    clarify = None
    if level != "red":
        clarify = DEFAULT_CLARIFY if ex.failed and not net.fired else clarify_question(ex.unclear_codes)
    if mother is not None:
        _upsert_assessment(s, mother, interaction_id, a, ex, script_ids, now)
        refresh_status(s, mother)
    log(logger, "assessment", interaction_id=interaction_id, risk_level=level, rule_ids=a.rule_ids,
        scripts=script_ids, safety_net=net.fired, extraction_failed=ex.failed,
        ms=round((time.perf_counter() - started) * 1000))  # fmt: skip
    return PipelineResult(a, level, a.rule_ids, say, script_ids, transfer, clarify, ticket or active_before,
                          entries, ex)  # fmt: skip


def _transfer_to(s: Session, mother: Mother | None, level: str, caller: str | None, purpose: str,
                 live: bool) -> str | None:  # fmt: skip
    if level != "red" or mother is None or not live or purpose == "family_alert":
        return None
    if get_settings().family_contact != "transfer":  # the backend phones the family instead (ticket_service)
        return None
    for f in sorted(mrepo.family_of(s, mother.id), key=lambda f: not f.decision_maker):
        if f.phone != caller:
            return f.phone
    return None


async def assess_facts(s: Session, mother: Mother, facts: list[Fact], interaction_id: str,
                       now: datetime) -> rules.Assessment:  # fmt: skip
    """Rules on confirmed facts (record-update path, e.g. ASHA-measured BP)."""
    prev = rrepo.previous_assessment(s, mother.id, interaction_id)
    a = rules.assess(AssessmentInput(tuple(facts), profile_for(s, mother, now),
                                     frozenset(prev.rule_ids) if prev else frozenset()))  # fmt: skip
    await ticket_service.apply_assessment(s, mother, a, now, live=False)
    _upsert_assessment(s, mother, interaction_id, a, Extracted(facts=facts), [], now)
    _schedule_recheck(s, mother, a, now)
    refresh_status(s, mother)
    return a


async def assess_missed_calls(s: Session, mother: Mother, now: datetime) -> rules.Assessment:
    """H-MISSED-01: two consecutive scheduled calls unanswered → amber + ASHA task."""
    iid = f"missed_{mother.id}_{ist_today(now).isoformat()}_{mother.consecutive_missed}"
    a = rules.assess(AssessmentInput((), profile_for(s, mother, now),
                                     consecutive_missed_calls=mother.consecutive_missed))  # fmt: skip
    if a.overall_level != "green":
        await ticket_service.apply_assessment(s, mother, a, now, live=False)
        _upsert_assessment(s, mother, iid, a, Extracted(), [], now)
        refresh_status(s, mother)
    return a

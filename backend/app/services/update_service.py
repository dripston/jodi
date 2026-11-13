"""record-update / confirm-update (contracts §4.4, §4.5): read back before saving."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from sqlmodel import Session

from app.db.models import Mother, PendingUpdate
from app.domain import access
from app.domain.facts import Fact
from app.domain.labels import clarify_question, describe_facts, join_words
from app.domain.transcript import caller_text
from app.domain.updates import describe_medicine, parse_medicines
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.schemas.api import ConfirmIn, ConfirmOut, PendingOut, RecordUpdateIn
from app.services import assessment_service, record_service, ticket_service
from app.services.ids import new_id
from app.services.voice_service import identify

WHICH_MOTHER = "Which mother is this about? Please tell me her name or phone number."
NOT_CAUGHT = "I did not catch the details. Could you say them again?"


_AFFIRM_ONLY = re.compile(r"^\W*(yes|haudu|houdu|haan|ha|sari|ok|okay|correct|thank you|illa|no)\W*$", re.IGNORECASE)


def last_statement(transcript: str) -> str | None:
    """The caller's latest substantive turn (not a bare yes/no), used as a free-text note."""
    from app.domain.transcript import AGENT_ROLES, split_turns

    turns = [t.strip() for role, t in split_turns(transcript) if role not in AGENT_ROLES and t.strip()]
    for t in reversed(turns):
        if len(t.split()) >= 3 and not _AFFIRM_ONLY.match(t):
            return t[:300]
    return None


def _mother_by_name(candidates: list[Mother], text: str) -> Mother | None:
    hits = [m for m in candidates if m.name and re.search(rf"(?<!\w){re.escape(m.name)}(?!\w)", text, re.IGNORECASE)]
    return hits[0] if len(hits) == 1 else None


def resolve_mother(s: Session, ident: access.CallerIdentity, about_phone: str | None, text: str) -> Mother | None:
    if ident.role in ("mother", "family") and ident.mother_ids:
        return mrepo.get_mother(s, ident.mother_ids[0])
    if about_phone and (m := mrepo.mother_by_phone(s, about_phone)):
        return m
    if ident.role == "asha" and ident.asha_id:
        own = mrepo.mothers_of_asha(s, ident.asha_id)
        if m := _mother_by_name(own, text):
            return m
        if len(own) == 1:
            return own[0]
    return _mother_by_name(mrepo.list_mothers(s), text)


def _source(ident: access.CallerIdentity, mother: Mother, doctor_name: str | None) -> tuple[str, list[str]]:
    if ident.role == "asha" and mother.id not in ident.mother_ids:
        return "family_reported", ["unverified_caller"]
    flags = ["unverified_caller"] if ident.role == "unknown" else []
    return access.source_for(ident.role, doctor_name), flags


def _readback(mother: Mother, facts: list[Fact], meds: list[dict[str, Any]], doctor: str | None) -> str:
    parts = describe_facts([f for f in facts if f.present]) + [
        ("started " if m["action"] == "started" else "") + describe_medicine(m) for m in meds
    ]
    who = f"Doctor {doctor}, for {mother.name}" if doctor else mother.name
    return f"I heard: {who}, {join_words(parts)}. Shall I save this?"


async def record_update(s: Session, body: RecordUpdateIn, now: datetime) -> PendingOut:
    ident = identify(s, body.caller_phone)
    text = caller_text(body.transcript)
    mother = resolve_mother(s, ident, body.about_mother_phone, text)
    if mother is None:
        return PendingOut(pending_id=None, readback_text=WHICH_MOTHER)
    iid = body.interaction_id or new_id("upd")
    ex = await assessment_service.extract(body.transcript, f"{iid}:update", f"Update from {ident.role}.")
    meds = parse_medicines(text)
    _, doctor = access.detect_doctor(text) if ident.role == "mother" else (False, None)
    note = None if ex.facts or meds else last_statement(body.transcript)
    if not ex.facts and not meds and not note:
        q = clarify_question(ex.unclear_codes) if ex.unclear_codes else NOT_CAUGHT
        return PendingOut(pending_id=None, readback_text=q)
    source, flags = _source(ident, mother, doctor)
    # a measurement or prescription means a health worker has seen her; a note alone does not
    is_health_worker = source in ("asha_measured", "doctor_verified") and bool(ex.facts or meds)
    p = PendingUpdate(
        id=new_id("p"), kind="record", mother_id=mother.id, caller_phone=body.caller_phone, interaction_id=iid,
        source=source, created_at=now,
        readback_text=f"I heard: {note}. Shall I save this?" if note else _readback(mother, ex.facts, meds, doctor),
        payload={"facts": [f.to_dict() for f in ex.facts], "medicines": meds, "doctor_name": doctor, "note": note,
                 "flags": flags, "mark_reached": is_health_worker,
                 "visit": source == "asha_measured" and bool(ex.facts)},
    )  # fmt: skip
    s.add(p)
    s.commit()
    return PendingOut(pending_id=p.id, readback_text=p.readback_text)


async def confirm_update(s: Session, body: ConfirmIn, now: datetime) -> ConfirmOut:
    from app.services import onboarding_service

    p = rrepo.get_pending(s, body.pending_id)
    if p.status == "saved":
        return ConfirmOut(saved=True, entry_ids=list(p.payload.get("entry_ids", [])), say="Saved. Thank you.")
    if not body.confirmed:
        p.status = "rejected"
        s.commit()
        return ConfirmOut(saved=False, entry_ids=[], say="Okay, I have not saved it. Please tell me again.")
    if p.kind == "onboarding":
        ids = await onboarding_service.apply_onboarding(s, p, now)
    else:
        ids = await _apply_record(s, p, now)
    p.status = "saved"
    p.payload = {**p.payload, "entry_ids": ids}
    s.commit()
    return ConfirmOut(saved=True, entry_ids=ids, say="Saved. Thank you.")


async def _apply_record(s: Session, p: PendingUpdate, now: datetime) -> list[str]:
    mother = mrepo.get_mother(s, p.mother_id or "")
    pl = p.payload
    facts = [Fact.from_dict(f) for f in pl.get("facts", [])]
    flags = list(pl.get("flags", []))
    entries = []
    if pl.get("visit"):
        entries.append(record_service.append_entry(
            s, mother, subject="mother", kind="visit", source=p.source, now=now, value="ASHA home visit",
            source_phone=p.caller_phone, interaction_id=p.interaction_id, flags=flags))  # fmt: skip
    entries += record_service.save_facts(s, mother, facts, source=p.source, now=now, source_phone=p.caller_phone,
                                         interaction_id=p.interaction_id, flags=flags)  # fmt: skip
    if note := pl.get("note"):
        entries.append(record_service.append_entry(
            s, mother, subject="mother", kind="note", source=p.source, now=now, value=note,
            source_phone=p.caller_phone, interaction_id=p.interaction_id, flags=flags))  # fmt: skip
    for med in pl.get("medicines", []):
        mflags = [*flags, "stopped"] if med.get("action") == "stopped" else flags
        value = describe_medicine({**med, "action": "started"})
        if doctor := pl.get("doctor_name"):
            value = f"{value} (Doctor {doctor})"
        entries.append(record_service.append_entry(
            s, mother, subject="mother", kind="medicine", source=p.source, now=now, value=value,
            source_phone=p.caller_phone, interaction_id=p.interaction_id, flags=mflags))  # fmt: skip
    if facts:
        await assessment_service.assess_facts(s, mother, facts, p.interaction_id or p.id, now)
    t = rrepo.active_ticket(s, mother.id)
    if pl.get("mark_reached") and t and t.state in ("open", "notified", "acknowledged"):
        by = f"asha:{mother.asha_id}" if p.source == "asha_measured" else (p.caller_phone or "doctor")
        ticket_service.mark_reached(s, t.id, by, f"seen by health worker ({p.source})", now)
    return [e.id for e in entries]

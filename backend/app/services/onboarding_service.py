"""Onboarding: discharge-slip photo (Document AI) → pending fields → voice read-back → confirm."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

from sqlmodel import Session, col, select

from app.core.config import get_settings
from app.core.errors import DomainError, NotFound
from app.core.logging import log
from app.core.time import ist_today
from app.db.models import Baby, DocJob, FamilyContact, Mother, PendingUpdate
from app.domain.scheduling import is_high_risk
from app.domain.updates import describe_medicine, onboarding_readback
from app.integrations.registry import get_integrations
from app.integrations.sarvam_llm import ExtractionError
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.schemas.api import FamilyIn, OnboardingSaveIn, PendingOut, PhotoOut, RegisterIn
from app.services import call_service, record_service
from app.services.ids import new_id
from app.services.status import refresh_status

logger = logging.getLogger(__name__)
PROFILE_FIELDS = ("delivery_date", "delivery_type", "complications", "baby_birth_weight_grams",
                  "gestation_weeks", "medicines")  # fmt: skip


def normalize_medicines(meds: object) -> list[dict[str, str]]:
    """Contract shape: name/dose/frequency are strings ("" when not written on the slip)."""
    out = []
    for m in meds if isinstance(meds, list) else []:
        if isinstance(m, dict) and m.get("name"):
            out.append({"name": str(m["name"]), "dose": str(m.get("dose") or ""),
                        "frequency": str(m.get("frequency") or "")})  # fmt: skip
    return out


def ensure_mother(s: Session, phone: str, now: datetime) -> Mother:
    m = mrepo.mother_by_phone(s, phone)
    if m:
        return m
    m = Mother(id=new_id("m"), name="New mother", phone=phone, created_at=now)
    s.add(m)
    s.add(Baby(id=new_id("b"), mother_id=m.id))
    s.commit()
    return m


def _photo_out(job: DocJob) -> PhotoOut:
    status = "pending" if job.status == "pending" else "done"
    return PhotoOut(job_id=job.id, fields=job.fields, status=status, mother_id=job.mother_id, error=job.error)


async def submit_photo(s: Session, phone: str, filename: str, content: bytes, content_type: str,
                       now: datetime) -> PhotoOut:  # fmt: skip
    mother = ensure_mother(s, phone, now)
    job = DocJob(id=new_id("job"), phone=phone, mother_id=mother.id, created_at=now)
    try:
        job.provider_job_id = await get_integrations().doc_reader.submit(filename, content, content_type)
    except DomainError as exc:
        job.status, job.error = "failed", exc.message
    s.add(job)
    s.commit()
    return await poll_photo(s, job.id, now) if job.status == "pending" else _photo_out(job)


async def poll_photo(s: Session, job_id: str, now: datetime) -> PhotoOut:
    job = s.get(DocJob, job_id)
    if job is None:
        raise NotFound(f"job {job_id} not found")
    if job.status != "pending" or not job.provider_job_id:
        return _photo_out(job)
    try:
        st = await get_integrations().doc_reader.poll(job.provider_job_id)
    except DomainError as exc:
        job.status, job.error = "failed", exc.message
        s.commit()
        return _photo_out(job)
    if st.status == "done":
        fields = dict(st.fields or {})
        if not fields.get("delivery_date") and get_settings().sarvam_mock:  # mock slip only; never invent real data
            mother = mrepo.get_mother(s, job.mother_id or "")
            fields["delivery_date"] = (mother.delivery_date or ist_today(now) - timedelta(days=1)).isoformat()
        fields["medicines"] = normalize_medicines(fields.get("medicines"))
        job.fields = {**{k: fields.get(k) for k in PROFILE_FIELDS}, "confidence": st.confidence}
        job.status = "done"
    elif st.status == "failed":
        job.status, job.error = "failed", st.error
    if (now - job.created_at).total_seconds() > 120 and job.status == "pending":  # type: ignore[operator]
        job.status, job.error = "failed", "timed out"
    s.commit()
    log(logger, "docai poll", job_id=job.id, status=job.status)
    return _photo_out(job)


def _photo_fields(s: Session, mother_id: str) -> dict[str, Any]:
    q = select(DocJob).where(DocJob.mother_id == mother_id, DocJob.status == "done")
    job = s.exec(q.order_by(col(DocJob.created_at).desc())).first()
    if not job or not job.fields:
        return {}
    return {k: v for k, v in job.fields.items() if k != "confidence" and v not in (None, [], "")}


async def onboarding_save(s: Session, body: OnboardingSaveIn, now: datetime) -> PendingOut:
    if not body.phone:  # no caller number (dashboard test): read back, but never create a phoneless mother
        try:
            voice = await get_integrations().extractor.extract_onboarding(body.transcript, ist_today(now))
        except ExtractionError:
            voice = {}
        return PendingOut(pending_id=None, readback_text=onboarding_readback(voice))
    mother = ensure_mother(s, body.phone, now)
    photo = _photo_fields(s, mother.id)
    try:
        voice = await get_integrations().extractor.extract_onboarding(body.transcript, ist_today(now))
    except ExtractionError:
        voice = {}
    fields = {**photo, **voice}
    sources = {k: ("mother_reported" if k in voice else "document_extracted") for k in fields}
    readback = onboarding_readback(fields)
    if not fields:
        return PendingOut(pending_id=None, readback_text=readback)
    p = PendingUpdate(id=new_id("p"), kind="onboarding", mother_id=mother.id, caller_phone=body.phone,
                      interaction_id=body.interaction_id or new_id("onb"), source="mother_reported",
                      readback_text=readback, payload={"fields": fields, "sources": sources}, created_at=now)  # fmt: skip
    s.add(p)
    s.commit()
    return PendingOut(pending_id=p.id, readback_text=readback)


async def register(s: Session, body: RegisterIn, now: datetime) -> Mother:
    """Dashboard onboarding: the ASHA confirms the slip fields (OCR) and adds her real name and family.
    Creates the health record now; Jodi asks the mother's own consent on the first call."""
    mother = ensure_mother(s, body.phone, now)
    mother.name = body.name.strip() or mother.name
    if body.language in ("kn", "hi", "en"):
        mother.language = body.language
    if body.asha_id:
        mother.asha_id = body.asha_id
    if body.lat is not None and body.lng is not None:
        mother.lat, mother.lng = body.lat, body.lng
    s.commit()
    typed = {k: v for k, v in body.model_dump(include=SLIP_FIELDS).items() if v not in (None, [], "")}
    if "medicines" in typed:
        typed["medicines"] = normalize_medicines(typed["medicines"])
    fields = {**_photo_fields(s, mother.id), **typed}  # what the ASHA confirmed on screen wins
    p = PendingUpdate(id=new_id("p"), kind="onboarding", mother_id=mother.id, caller_phone=None,
                      interaction_id=f"dash_{mother.id}_{int(now.timestamp())}", source="document_extracted",
                      status="saved", payload={"fields": fields, "sources": dict.fromkeys(fields, "document_extracted")},
                      readback_text="(confirmed on the dashboard)", created_at=now)  # fmt: skip
    s.add(p)
    s.commit()
    await apply_onboarding(s, p, now, consent_by="dashboard:asha")
    _set_family(s, mother, body.family)
    from app.services.telegram_onboarding import rebind_family_links  # avoids an import cycle

    rebind_family_links(s, mother)
    refresh_status(s, mother)
    return mother


SLIP_FIELDS = {"delivery_date", "delivery_type", "complications", "baby_birth_weight_grams", "gestation_weeks",
               "medicines"}  # fmt: skip


def _set_family(s: Session, mother: Mother, family: list[FamilyIn]) -> None:
    """Add/update family contacts by phone; exactly one decision-maker (the flagged one, else the first)."""
    if not family:
        return
    dm_index = next((i for i, f in enumerate(family) if f.decision_maker), 0)
    existing = {c.phone: c for c in mrepo.family_of(s, mother.id)}
    for c in existing.values():
        c.decision_maker = False
    for i, f in enumerate(family):
        c = existing.get(f.phone) or FamilyContact(mother_id=mother.id, phone=f.phone)
        c.name, c.relation, c.decision_maker = f.name, f.relation, i == dm_index
        s.add(c)
    s.commit()


def _apply_profile(s: Session, mother: Mother, f: dict[str, Any]) -> None:
    baby = mrepo.baby_of(s, mother.id)
    if d := f.get("delivery_date"):
        mother.delivery_date = date.fromisoformat(d)
    mother.delivery_type = f.get("delivery_type", mother.delivery_type)
    if f.get("complications"):
        mother.complications = list(dict.fromkeys([*mother.complications, *f["complications"]]))
    if f.get("language") in ("kn", "hi", "en"):
        mother.language = f["language"]
    if baby:
        baby.birth_weight_grams = f.get("baby_birth_weight_grams", baby.birth_weight_grams)
        baby.gestation_weeks = f.get("gestation_weeks", baby.gestation_weeks)
    if fam := f.get("family_contact"):
        existing = [c for c in mrepo.family_of(s, mother.id) if c.phone == fam["phone"]]
        if not existing:
            for c in mrepo.family_of(s, mother.id):
                c.decision_maker = False
            s.add(FamilyContact(mother_id=mother.id, name=fam.get("name", ""), relation=fam.get("relation", ""),
                                phone=fam["phone"], decision_maker=True))  # fmt: skip
    high = is_high_risk(mother.delivery_type, mother.complications,
                        baby.birth_weight_grams if baby else None, baby.gestation_weeks if baby else None)  # fmt: skip
    mother.risk_profile = "high" if high else "standard"


def _onboarding_entries(s: Session, mother: Mother, p: PendingUpdate, f: dict[str, Any], now: datetime) -> list[str]:
    src = p.payload.get("sources", {})
    ids = []
    already = {(e.kind, e.value) for e in rrepo.entries_in_order(s, mother.id)}

    def add(key: str, subject: str, kind: str, value: str, num: float | None = None, unit: str | None = None,
            code: str | None = None) -> None:  # fmt: skip
        if (kind, value) in already:  # re-confirming the same detail (e.g. voice after Telegram) adds nothing
            return
        e = record_service.append_entry(s, mother, subject=subject, kind=kind, source=src.get(key, "mother_reported"),
                                        now=now, code=code, value=value, numeric_value=num, unit=unit,
                                        source_phone=p.caller_phone, interaction_id=p.interaction_id)  # fmt: skip
        ids.append(e.id)

    if f.get("delivery_date") or f.get("delivery_type"):
        add(
            "delivery_type",
            "mother",
            "onboarding",
            f"Delivered {f.get('delivery_date', '')} ({(f.get('delivery_type') or '').replace('_', '-')})".strip(),
        )
    for c in f.get("complications", []):
        add("complications", "mother", "onboarding", f"In pregnancy: {c.replace('_', ' ')}")
    if g := f.get("baby_birth_weight_grams"):
        add("baby_birth_weight_grams", "baby", "onboarding", f"Birth weight {g / 1000:g} kg", float(g), "g")
    if w := f.get("gestation_weeks"):
        add("gestation_weeks", "baby", "onboarding", f"Born at {w} weeks")
    for m in f.get("medicines", []):
        add("medicines", "mother", "medicine", describe_medicine({**m, "action": "started"}))
    return ids


async def apply_onboarding(s: Session, p: PendingUpdate, now: datetime, consent_by: str | None = None) -> list[str]:
    """Apply confirmed onboarding fields. `consent_by` (e.g. "telegram:family") records consent given
    in another channel; the mother's own spoken consent is then still asked on her first call
    (consent_at stays empty until she gives it)."""
    mother = mrepo.get_mother(s, p.mother_id or "")
    f = dict(p.payload.get("fields", {}))
    _apply_profile(s, mother, f)
    if consent_by is None:
        mother.consent_at = now  # spoken consent is part of the confirmed read-back
    mother.onboarded_at = mother.onboarded_at or now
    s.commit()
    ids = _onboarding_entries(s, mother, p, f, now)
    channel, _, by = (consent_by or "").partition(":")
    if consent_by is None:
        note = "Spoken consent recorded on onboarding call"
    elif channel == "telegram":
        note = f"Consent recorded via Telegram by {by}"
    else:
        note = f"Registered on the {channel} by the {by}; her own spoken consent is asked on her first call"
    record_service.append_entry(s, mother, subject="mother", kind="note", source="system", now=now,
                                value=note, source_phone=p.caller_phone, interaction_id=p.interaction_id)  # fmt: skip
    call_service.plan_milestones(s, mother, now)
    refresh_status(s, mother)
    return ids

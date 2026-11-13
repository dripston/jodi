"""Side effects of the Telegram flow: linking, slip/prescription reading, saving onboarding."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.time import to_ist
from app.db.models import Asha, FamilyContact, Mother, PendingUpdate, TelegramLink
from app.domain.scheduling import is_high_risk
from app.domain.updates import describe_medicine
from app.integrations.registry import get_integrations
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.services import call_service, onboarding_service, record_service
from app.services import telegram_send as tg
from app.services.ids import new_id
from app.services.status import refresh_status


def link_chat(s: Session, chat_id: str, tg_user_id: str, phone: str, mother_id: str | None, role: str,
              now: datetime) -> TelegramLink:  # fmt: skip
    link = s.get(TelegramLink, chat_id) or TelegramLink(chat_id=chat_id)
    link.tg_user_id, link.phone, link.mother_id, link.role = tg_user_id, phone, mother_id, role
    link.linked_at, link.active = now, True
    s.add(link)
    s.commit()
    return link


def lookup_and_link(s: Session, chat_id: str, tg_user_id: str, phone: str, now: datetime) -> dict[str, Any]:
    """Match a verified phone: Mother.phone → mother, FamilyContact.phone → family, ASHA → asha."""
    if (m := mrepo.mother_by_phone(s, phone)) and m.delivery_date is not None:
        link_chat(s, chat_id, tg_user_id, phone, m.id, "mother", now)
        return {"role": "mother", "name": m.name}
    if fam := s.exec(select(FamilyContact).where(FamilyContact.phone == phone)).first():
        m = mrepo.get_mother(s, fam.mother_id)
        link_chat(s, chat_id, tg_user_id, phone, m.id, "family", now)
        return {"role": "family", "name": m.name}
    if asha := s.exec(select(Asha).where(Asha.phone == phone)).first():
        link_chat(s, chat_id, tg_user_id, phone, None, "asha", now)
        return {"role": "asha", "name": f"ASHA {asha.name}'s mothers (see the Jodi app)"}
    return {}


async def read_document(s: Session, file_id: str, phone: str, now: datetime) -> dict[str, Any]:
    """Download a photo, run Document AI (reusing onboarding_service), poll with backoff ≤ 60 s."""
    try:
        content, name, ctype = await get_integrations().telegram.get_file_bytes(file_id)
    except Exception:
        return {"ok": False, "fields": {}}
    out = await onboarding_service.submit_photo(s, phone, name, content, ctype, now)
    waited, delay = 0.0, 1.0
    while out.status == "pending" and waited < get_settings().docai_poll_max_s:
        await asyncio.sleep(delay)
        waited += delay
        delay = min(delay * 2, 8.0)
        out = await onboarding_service.poll_photo(s, out.job_id, now)
    ok = out.status == "done" and out.fields is not None
    return {"ok": ok, "fields": dict(out.fields or {}) if ok else {}, "job_id": out.job_id}


def _typed_fields(d: dict[str, Any]) -> dict[str, Any]:
    f: dict[str, Any] = {k: d[k] for k in ("delivery_date", "delivery_type", "language") if d.get(k)}
    if d.get("baby_weight"):
        f["baby_birth_weight_grams"] = d["baby_weight"]
    if d.get("dm_phone"):
        f["family_contact"] = {"name": d.get("dm_name") or "", "relation": d.get("dm_relation") or "family",
                               "phone": d["dm_phone"], "decision_maker": True}  # fmt: skip
    return f


def _add_registrant_contact(s: Session, mother: Mother, d: dict[str, Any]) -> None:
    phone = d.get("registrant_phone")
    if d.get("role") != "family" or not phone or any(c.phone == phone for c in mrepo.family_of(s, mother.id)):
        return
    s.add(FamilyContact(mother_id=mother.id, name=d.get("registrant_name") or "", relation="family", phone=phone))
    s.commit()


def _mark_preterm(s: Session, mother: Mother, source: str, phone: str | None, now: datetime) -> None:
    if "preterm_birth" not in mother.complications:
        mother.complications = [*mother.complications, "preterm_birth"]
    baby = mrepo.baby_of(s, mother.id)
    high = is_high_risk(mother.delivery_type, mother.complications, baby.birth_weight_grams if baby else None,
                        baby.gestation_weeks if baby else None)  # fmt: skip
    mother.risk_profile = "high" if high else "standard"
    s.commit()
    record_service.append_entry(s, mother, subject="baby", kind="onboarding", source=source, now=now,
                                value="Born early (before 37 weeks)", source_phone=phone)  # fmt: skip
    call_service.plan_milestones(s, mother, now)


async def save_onboarding(s: Session, chat_id: str, tg_user_id: str, d: dict[str, Any], now: datetime) -> Mother:
    role = d.get("role") or "family"
    reported = "mother_reported" if role == "mother" else "family_reported"
    mother = onboarding_service.ensure_mother(s, d["mother_phone"], now)
    mother.name = d.get("mother_name") or mother.name
    s.commit()
    photo = {k: v for k, v in (d.get("slip_fields") or {}).items() if k != "confidence" and v not in (None, [], "")}
    typed = _typed_fields(d)
    fields = {**photo, **typed}  # typed answers win
    sources = {k: (reported if k in typed else "document_extracted") for k in fields}
    p = PendingUpdate(id=new_id("p"), kind="onboarding", mother_id=mother.id, caller_phone=d.get("registrant_phone"),
                      interaction_id=f"tg_{chat_id}_{int(now.timestamp())}", source=reported, status="saved",
                      payload={"fields": fields, "sources": sources}, readback_text="(confirmed on Telegram)",
                      created_at=now)  # fmt: skip
    s.add(p)
    s.commit()
    await onboarding_service.apply_onboarding(s, p, now, consent_by=f"telegram:{role}")
    _add_registrant_contact(s, mother, d)
    if d.get("born_early") == "yes":
        _mark_preterm(s, mother, reported, d.get("registrant_phone"), now)
    refresh_status(s, mother)
    link_chat(s, chat_id, tg_user_id, d.get("registrant_phone") or "", mother.id, role, now)
    return mother


def welcome_values(s: Session, mother: Mother) -> dict[str, Any]:
    pending = rrepo.pending_scheduled(s, mother.id)
    first = pending[0] if pending else None
    when = to_ist(first.due_at) if first and first.due_at else None
    return {"name": mother.name, "first_call_day": first.day if first and first.day is not None else "?",
            "first_call_date": f"{when.day} {when.strftime('%b')}" if when else "soon"}  # fmt: skip


def save_prescription(s: Session, link: TelegramLink, medicines: list[dict[str, Any]], now: datetime) -> list[str]:
    mother = mrepo.get_mother(s, link.mother_id or "")
    ids = []
    for med in medicines:
        value = f"{describe_medicine({**med, 'action': 'started'})} (confirmed via Telegram by {tg.chat_role(s, link)})"
        e = record_service.append_entry(s, mother, subject="mother", kind="medicine", source="document_extracted",
                                        now=now, value=value, source_phone=link.phone)  # fmt: skip
        ids.append(e.id)
    return ids

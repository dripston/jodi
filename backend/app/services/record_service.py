"""Append-only, hash-chained record; timeline; spoken summary; vitals series."""

from __future__ import annotations

import threading
from datetime import datetime
from typing import Any

from sqlmodel import Session

from app.core.time import day_since_delivery, iso
from app.db.models import Entry, Mother
from app.domain.chain import GENESIS, ChainVerdict, compute_hash, verify_chain
from app.domain.facts import Fact, entry_kind_for
from app.domain.labels import describe
from app.repositories import mothers as mrepo
from app.repositories import records as rrepo
from app.services.ids import new_id
from app.services.serializers import entry_hash_body

_APPEND_LOCK = threading.Lock()
DELIVERY_LABEL = {"c_section": "C-section", "normal": "normal delivery", "assisted": "assisted delivery"}


def append_entry(
    s: Session, mother: Mother, *, subject: str, kind: str, source: str, now: datetime,
    code: str | None = None, value: str | None = None, numeric_value: float | None = None,
    unit: str | None = None, quote: str | None = None, source_phone: str | None = None,
    interaction_id: str | None = None, flags: list[str] | None = None,
) -> Entry:  # fmt: skip
    """Append one entry to the mother's chain and commit. Never updates or deletes."""
    baby = mrepo.baby_of(s, mother.id)
    subject_id = (baby.id if baby else f"b_{mother.id}") if subject == "baby" else mother.id
    with _APPEND_LOCK:
        last = rrepo.last_entry(s, mother.id)
        prev = last.hash if last else GENESIS
        entry = Entry(
            id=new_id("e"), mother_id=mother.id, subject=subject, subject_id=subject_id, kind=kind,
            code=code, value=value, numeric_value=float(numeric_value) if numeric_value is not None else None,
            unit=unit, quote=quote, source=source, source_phone=source_phone, interaction_id=interaction_id,
            created_at=iso(now) or "", flags=list(flags or []), prev_hash=prev, hash="",
        )  # fmt: skip
        entry.hash = compute_hash(prev, entry_hash_body(entry))
        s.add(entry)
        s.commit()
        s.refresh(entry)
    return entry


def _fact_key(subject: str, code: str | None, numeric: float | None, value: str | None) -> tuple[Any, ...]:
    return (subject, code, numeric, (value or "").startswith("no "))


def save_facts(
    s: Session, mother: Mother, facts: list[Fact], *, source: str, now: datetime,
    source_phone: str | None, interaction_id: str | None, flags: list[str] | None = None,
) -> list[Entry]:  # fmt: skip
    """Save facts as entries, skipping ones already saved for this interaction."""
    existing = {_fact_key(e.subject, e.code, e.numeric_value, e.value)
                for e in (rrepo.entries_for_interaction(s, interaction_id) if interaction_id else [])}  # fmt: skip
    out: list[Entry] = []
    for f in facts:
        value = describe(f)
        key = _fact_key(f.subject, f.code, f.numeric_value, value)
        if key in existing:
            continue
        existing.add(key)
        out.append(append_entry(
            s, mother, subject=f.subject, kind=entry_kind_for(f.code), source=source, now=now,
            code=f.code, value=value, numeric_value=f.numeric_value, unit=f.unit, quote=f.quote,
            source_phone=source_phone, interaction_id=interaction_id, flags=flags,
        ))  # fmt: skip
    return out


def verify(s: Session, mother_id: str) -> ChainVerdict:
    mrepo.get_mother(s, mother_id)
    return verify_chain(entry_hash_body(e) for e in rrepo.entries_in_order(s, mother_id))


# ------------------------------------------------------------------ summary
def _day_of(mother: Mother, created_at: str) -> int | None:
    if not mother.delivery_date:
        return None
    return day_since_delivery(mother.delivery_date, datetime.fromisoformat(created_at.replace("Z", "+00:00")))


def active_medicines(entries: list[Entry]) -> list[str]:
    meds: dict[str, str] = {}
    for e in entries:
        if e.kind != "medicine" or e.code is not None or not e.value:
            continue
        name = e.value.split()[0].lower()
        if "stopped" in e.flags:
            meds.pop(name, None)
        else:
            meds[name] = e.value
    return list(meds.values())


def _latest(entries: list[Entry], code: str) -> Entry | None:
    return next((e for e in reversed(entries) if e.code == code and e.numeric_value is not None), None)


def _bp_sentence(mother: Mother, entries: list[Entry]) -> str | None:
    sys_e, dia_e = _latest(entries, "bp_systolic"), _latest(entries, "bp_diastolic")
    if not (sys_e and dia_e):
        return None
    day = _day_of(mother, sys_e.created_at)
    return f"BP {sys_e.numeric_value:g}/{dia_e.numeric_value:g} on day {day}." if day is not None else None


def _baby_sentence(s: Session, mother: Mother, entries: list[Entry]) -> str | None:
    baby = mrepo.baby_of(s, mother.id)
    parts = []
    if baby and baby.birth_weight_grams:
        parts.append(f"Baby {baby.birth_weight_grams / 1000:g} kg at birth")
    if w := _latest(entries, "weight_grams"):
        parts.append(f"{w.numeric_value / 1000:g} kg on day {_day_of(mother, w.created_at)}")  # type: ignore[operator]
    return (", ".join(parts) + ".") if parts else None


def _recent_signs(mother: Mother, entries: list[Entry], now: datetime) -> str | None:
    cutoff = iso(now.replace(microsecond=0)) or ""
    today = day_since_delivery(mother.delivery_date, now) if mother.delivery_date else None
    signs: list[str] = []
    for e in reversed(entries):
        if e.kind != "symptom" or not e.value or e.value.startswith("no ") or e.created_at > cutoff:
            continue
        day = _day_of(mother, e.created_at)
        if today is not None and day is not None and today - day > 3:
            break
        label = f"{e.value} (day {day})" if day is not None else e.value
        if label not in signs:
            signs.append(label)
    return ("Recent: " + ", ".join(signs[:5]) + ".") if signs else None


def summary_text(s: Session, mother: Mother, now: datetime, scope: str = "full") -> str:
    """The exact text Jodi reads aloud (contracts §4.3 / §6.1)."""
    day = day_since_delivery(mother.delivery_date, now) if mother.delivery_date else None
    ticket = rrepo.active_ticket(s, mother.id)
    alert = f"Open alert: {ticket.level}, {ticket.reason_text}." if ticket else "No open alerts."
    if scope != "full":
        return f"{mother.name}, day {day}. Current status: {mother.status}. {alert}"
    entries = rrepo.entries_in_order(s, mother.id)
    first = f"{mother.name}, day {day}" if day is not None else mother.name
    if mother.delivery_date:
        dlabel = DELIVERY_LABEL.get(mother.delivery_type or "", "delivery")
        first += f" after {dlabel} on {mother.delivery_date.day} {mother.delivery_date.strftime('%B')}"
    parts = [first + "."]
    if mother.complications:
        parts.append("In pregnancy: " + ", ".join(c.replace("_", " ") for c in mother.complications) + ".")
    meds = active_medicines(entries)
    for sentence in (_bp_sentence(mother, entries), ("On " + ", ".join(meds) + ".") if meds else None,
                     _baby_sentence(s, mother, entries), _recent_signs(mother, entries, now)):  # fmt: skip
        if sentence:
            parts.append(sentence)
    parts.append(alert)
    return " ".join(parts)


def vitals(s: Session, mother_id: str) -> dict[str, list[dict[str, Any]]]:
    entries = rrepo.entries_in_order(s, mother_id)
    bp: list[dict[str, Any]] = []
    pending_sys: dict[tuple[str | None, str], Entry] = {}
    for e in entries:
        key = (e.interaction_id, e.created_at[:16])
        if e.code == "bp_systolic" and e.numeric_value is not None:
            pending_sys[key] = e
        elif e.code == "bp_diastolic" and e.numeric_value is not None:
            sys_e = pending_sys.pop(key, None) or next(
                (v for k, v in pending_sys.items() if k[0] == e.interaction_id), None)  # fmt: skip
            if sys_e:
                bp.append({"at": sys_e.created_at, "systolic": sys_e.numeric_value,
                           "diastolic": e.numeric_value, "source": e.source})  # fmt: skip
    weight = [{"at": e.created_at, "grams": e.numeric_value, "source": e.source}
              for e in entries if e.code == "weight_grams" and e.numeric_value is not None]  # fmt: skip
    breaths = [{"at": e.created_at, "value": e.numeric_value, "source": e.source}
               for e in entries if e.code == "breaths_per_minute" and e.numeric_value is not None]  # fmt: skip
    return {"bp": bp, "baby_weight": weight, "breaths_per_minute": breaths}

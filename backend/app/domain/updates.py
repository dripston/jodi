"""Deterministic parsing for record updates and onboarding answers. Pure.

Everything parsed here is read back to the caller and only saved after a clear "yes"
(confirm-update), so a miss leads to a correction, never to a silent wrong record.
"""

from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Any

from app.domain.transcript import caller_text

MEDICINES = (
    "iron", "ifa", "folic acid", "calcium", "labetalol", "nifedipine", "methyldopa",
    "paracetamol", "amoxicillin", "metronidazole", "vitamin d", "magnesium sulphate",
    "metformin", "insulin", "aspirin", "cefixime", "ibuprofen",
)  # fmt: skip
_MED = re.compile(
    r"(?P<stop>stop(?:ped)?\s+|band\s+)?(?<!\w)(?P<name>"
    + "|".join(re.escape(m) for m in sorted(MEDICINES, key=len, reverse=True))
    + r")(?!\w)(?:\s*(?P<dose>\d+(?:\.\d+)?)\s*(?P<unit>mg|mcg|g|ml|units?)?)?",
    re.IGNORECASE,
)
_FREQ = re.compile(
    r"twice\s+(?:a\s+)?da(?:il)?y|once\s+(?:a\s+)?da(?:il)?y|three\s+times\s+(?:a\s+)?day|thrice|\bBD\b|\bOD\b|\bTDS\b|at\s+night",
    re.IGNORECASE,
)
MONTHS = {m: i for i, m in enumerate(
    ["january", "february", "march", "april", "may", "june", "july", "august",
     "september", "october", "november", "december"], start=1)}  # fmt: skip
_MONTH_RE = "|".join([*MONTHS, *(m[:3] for m in MONTHS)])
_DATE_DMY = re.compile(rf"(\d{{1,2}})(?:st|nd|rd|th)?\s+({_MONTH_RE})[a-z]*(?:\s+(\d{{4}}))?", re.IGNORECASE)
_DATE_ISO = re.compile(r"(\d{4})-(\d{2})-(\d{2})")
_DAYS_AGO = re.compile(r"(\d+)\s+(?:days?\s+ago|dina\s+aaytu|din\s+pehle)", re.IGNORECASE)
_PHONE = re.compile(r"(?:\+?91[\s-]?)?([6-9]\d{9})\b")
_WEEKS = re.compile(r"(\d{2})\s*(?:weeks?|vaara|hafte)", re.IGNORECASE)
_KG = re.compile(r"(\d+(?:\.\d+)?)\s*(?:kg|kilo)", re.IGNORECASE)
RELATIONS = {
    "husband": "husband", "ganda": "husband", "pati": "husband", "yajamanru": "husband",
    "mother-in-law": "mother_in_law", "atte": "mother_in_law", "saas": "mother_in_law",
    "mother": "mother", "amma": "mother", "father": "father", "appa": "father",
    "brother": "brother", "anna": "brother", "sister": "sister",
}  # fmt: skip
_NAME = re.compile(r"(?:name\s+is|hesaru|naam)\s+([A-Z][a-z]+)|([A-Z][a-z]+),?\s+(?:my\s+)?(?:husband|ganda|pati)")


def parse_medicines(text: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for sentence in re.split(r"(?:[!?\n]|\.(?!\d))+", text):
        freq = _FREQ.search(sentence)
        for m in _MED.finditer(sentence):
            dose = m.group("dose")
            unit = m.group("unit") or ""
            out.append({
                "name": m.group("name").title() if m.group("name").lower() != "ifa" else "IFA",
                "dose": f"{dose} {unit}".strip() if dose else None,
                "frequency": freq.group(0).lower() if freq else None,
                "action": "stopped" if m.group("stop") else "started",
            })  # fmt: skip
    return out


def describe_medicine(med: dict[str, Any]) -> str:
    parts = [med["name"], med.get("dose") or "", med.get("frequency") or ""]
    text = " ".join(p for p in parts if p)
    return f"stop {text}" if med.get("action") == "stopped" else text


def _parse_date(text: str, today: date) -> date | None:
    if m := _DATE_ISO.search(text):
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    if m := _DATE_DMY.search(text):
        month = (
            MONTHS.get(m.group(2).lower()) or MONTHS[next(k for k in MONTHS if k.startswith(m.group(2).lower()[:3]))]
        )
        year = int(m.group(3)) if m.group(3) else today.year
        d = date(year, month, int(m.group(1)))
        return d if d <= today else date(year - 1, month, int(m.group(1)))
    if m := _DAYS_AGO.search(text):
        return today - timedelta(days=int(m.group(1)))
    if re.search(r"\byesterday\b|\bninne\b|\bkal\b", text, re.IGNORECASE):
        return today - timedelta(days=1)
    if re.search(r"\btoday\b|\bivattu\b|\baaj\b", text, re.IGNORECASE):
        return today
    return None


def _delivery_type(text: str) -> str | None:
    if re.search(r"c[\s-]?section|caesarean|cesarean|operation", text, re.IGNORECASE):
        return "c_section"
    if re.search(r"forceps|vacuum|assisted", text, re.IGNORECASE):
        return "assisted"
    if re.search(r"normal\s+(delivery|herige|aaytu)|\bnormal\b", text, re.IGNORECASE):
        return "normal"
    return None


def _complications(text: str) -> list[str]:
    out = []
    if re.search(r"\bbp\b|blood\s+pressure|pre-?eclampsia", text, re.IGNORECASE):
        out.append("high_bp_in_pregnancy")
    if re.search(r"sugar|diabetes", text, re.IGNORECASE):
        out.append("diabetes_in_pregnancy")
    if re.search(r"heavy\s+bleeding|bahut\s+khoon|rakta\s+jaasti", text, re.IGNORECASE):
        out.append("bleeding_at_delivery")
    return out


def _family(text: str) -> dict[str, Any] | None:
    phone = _PHONE.search(text)
    if not phone:
        return None
    relation = next((v for k, v in RELATIONS.items()
                     if re.search(rf"(?<!\w){re.escape(k)}(?!\w)", text, re.IGNORECASE)), "family")  # fmt: skip
    name_m = _NAME.search(text)
    name = (name_m.group(1) or name_m.group(2)) if name_m else ""
    return {"name": name, "relation": relation, "phone": f"+91{phone.group(1)}", "decision_maker": True}


def parse_onboarding(transcript: str, today: date) -> dict[str, Any]:
    """Onboarding fields (contracts §6 'Onboarding photo fields' + language + family)."""
    text = caller_text(transcript)
    fields: dict[str, Any] = {}
    if d := _parse_date(text, today):
        fields["delivery_date"] = d.isoformat()
    if t := _delivery_type(text):
        fields["delivery_type"] = t
    if c := _complications(text):
        fields["complications"] = c
    if kg := _KG.search(text):
        fields["baby_birth_weight_grams"] = round(float(kg.group(1)) * 1000)
    if w := _WEEKS.search(text):
        fields["gestation_weeks"] = int(w.group(1))
    if meds := parse_medicines(text):
        fields["medicines"] = meds
    lang = re.search(r"\b(kannada|hindi|english)\b", text, re.IGNORECASE)
    if lang:
        fields["language"] = {"kannada": "kn", "hindi": "hi", "english": "en"}[lang.group(1).lower()]
    if fam := _family(text):
        fields["family_contact"] = fam
    return fields


def spoken_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)[-10:]
    return " ".join([digits[:5], digits[5:]])


def onboarding_readback(fields: dict[str, Any]) -> str:
    parts: list[str] = []
    if d := fields.get("delivery_date"):
        dd = date.fromisoformat(d)
        parts.append(f"delivery on {dd.day} {dd.strftime('%B')}")
    if t := fields.get("delivery_type"):
        parts.append({"c_section": "C-section", "normal": "normal delivery", "assisted": "assisted delivery"}[t])
    if c := fields.get("complications"):
        parts.append("problems in pregnancy: " + ", ".join(x.replace("_", " ") for x in c))
    if g := fields.get("baby_birth_weight_grams"):
        parts.append(f"baby {g / 1000:g} kilograms at birth")
    if w := fields.get("gestation_weeks"):
        parts.append(f"born at {w} weeks")
    if meds := fields.get("medicines"):
        parts.append("medicines: " + "; ".join(describe_medicine(m) for m in meds))
    if fam := fields.get("family_contact"):
        who = ", ".join(x for x in (fam.get("name"), fam.get("relation")) if x)
        parts.append(f"family contact {who}, number {spoken_phone(fam['phone'])}")
    if not parts:
        return "I did not catch the details. Could you tell me the delivery date and type again?"
    return ("I heard: " + "; ".join(parts) + ". Do you agree that Jodi keeps your and your baby's "
            "health record and shares it only with your family and ASHA, and shall I save this?")  # fmt: skip

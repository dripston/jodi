"""Fact type and the closed fact-code list (docs/contracts.md §1, §3). Pure."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

Subject = Literal["mother", "baby"]

MOTHER_CODES: frozenset[str] = frozenset(
    {
        "bleeding_heavy", "pads_soaked_count", "pad_soaked_within_hour", "clots_large",
        "headache_severe", "vision_blurred", "swelling_face_hands", "bp_systolic",
        "bp_diastolic", "fever", "discharge_foul", "abdominal_pain_severe",
        "wound_red_or_oozing", "breast_red_painful", "calf_pain_swelling", "breathless",
        "chest_pain", "fits", "unconscious", "dizziness_fainting", "stopped_bp_medicine",
        "stopped_iron",
    }
)  # fmt: skip

BABY_CODES: frozenset[str] = frozenset(
    {
        "not_feeding", "feeding_poor", "fits", "breathing_fast", "breaths_per_minute",
        "chest_indrawing", "feels_hot", "feels_cold", "lethargic", "jaundice_palms_soles",
        "jaundice_face_body", "cord_red_or_pus", "vomiting_everything", "wet_nappies_count",
        "weight_grams",
    }
)  # fmt: skip

NUMERIC_CODES: frozenset[str] = frozenset(
    {"pads_soaked_count", "bp_systolic", "bp_diastolic", "breaths_per_minute",
     "wet_nappies_count", "weight_grams"}
)  # fmt: skip

VITAL_CODES: frozenset[str] = frozenset({"bp_systolic", "bp_diastolic", "breaths_per_minute", "weight_grams"})

CONFIDENCE_THRESHOLD = 0.6


@dataclass(frozen=True)
class Fact:
    subject: Subject
    code: str
    present: bool = True
    value: str | None = None
    numeric_value: float | None = None
    unit: str | None = None
    quote: str = ""
    confidence: float = 1.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "subject": self.subject, "code": self.code, "present": self.present,
            "value": self.value, "numeric_value": self.numeric_value, "unit": self.unit,
            "quote": self.quote, "confidence": self.confidence,
        }  # fmt: skip

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Fact:
        num = d.get("numeric_value")
        return cls(
            subject=d["subject"],
            code=d["code"],
            present=bool(d.get("present", True)),
            value=d.get("value"),
            numeric_value=float(num) if num is not None else None,
            unit=d.get("unit"),
            quote=d.get("quote") or "",
            confidence=float(d.get("confidence", 1.0)),
        )


def is_valid_code(subject: str, code: str) -> bool:
    if subject == "mother":
        return code in MOTHER_CODES
    if subject == "baby":
        return code in BABY_CODES
    return False


@dataclass
class ValidatedFacts:
    facts: list[Fact] = field(default_factory=list)
    unclear: list[Fact] = field(default_factory=list)
    dropped: list[dict[str, Any]] = field(default_factory=list)


def validate_facts(raw: list[dict[str, Any]]) -> ValidatedFacts:
    """Drop unknown codes; route low-confidence facts to `unclear` (not saved)."""
    out = ValidatedFacts()
    for item in raw:
        try:
            fact = Fact.from_dict(item)
        except (KeyError, TypeError, ValueError):
            out.dropped.append(item)
            continue
        if not is_valid_code(fact.subject, fact.code):
            out.dropped.append(item)
            continue
        if fact.code in NUMERIC_CODES and fact.present and fact.numeric_value is None:
            out.unclear.append(fact)
            continue
        if fact.confidence < CONFIDENCE_THRESHOLD:
            out.unclear.append(fact)
            continue
        out.facts.append(fact)
    return out


def entry_kind_for(code: str) -> str:
    if code in VITAL_CODES:
        return "vital"
    if code in {"stopped_bp_medicine", "stopped_iron"}:
        return "medicine"
    return "symptom"

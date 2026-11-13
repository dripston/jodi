"""Plain-English wording for facts (read-backs, summaries, call summaries). Pure."""

from __future__ import annotations

from app.domain.facts import Fact

LABELS: dict[str, str] = {
    "bleeding_heavy": "heavy bleeding",
    "pads_soaked_count": "{n} pads soaked since morning",
    "pad_soaked_within_hour": "a pad soaked within an hour",
    "clots_large": "large clots",
    "headache_severe": "severe headache",
    "vision_blurred": "blurred vision",
    "swelling_face_hands": "swelling of face or hands",
    "bp_systolic": "BP systolic {n}",
    "bp_diastolic": "BP diastolic {n}",
    "fever": "fever",
    "discharge_foul": "foul-smelling discharge",
    "abdominal_pain_severe": "severe tummy pain",
    "wound_red_or_oozing": "stitches red or oozing",
    "breast_red_painful": "breast red and painful",
    "calf_pain_swelling": "calf pain or swelling",
    "breathless": "breathlessness",
    "chest_pain": "chest pain",
    "fits": "fits",
    "unconscious": "unconscious",
    "dizziness_fainting": "dizziness or fainting",
    "stopped_bp_medicine": "stopped BP medicine",
    "stopped_iron": "stopped iron tablets",
    "not_feeding": "baby not feeding",
    "feeding_poor": "baby feeding less",
    "breathing_fast": "baby breathing fast",
    "breaths_per_minute": "baby {n} breaths per minute",
    "chest_indrawing": "baby chest indrawing",
    "feels_hot": "baby feels hot",
    "feels_cold": "baby feels cold",
    "lethargic": "baby very sleepy or floppy",
    "jaundice_palms_soles": "yellow palms or soles",
    "jaundice_face_body": "yellow face or body",
    "cord_red_or_pus": "cord red or with pus",
    "vomiting_everything": "baby vomiting everything",
    "wet_nappies_count": "{n} wet nappies",
    "weight_grams": "baby weight {kg} kilograms",
}


def _num(v: float | None) -> str:
    if v is None:
        return "?"
    return str(int(v)) if float(v).is_integer() else f"{v:g}"


def describe(fact: Fact) -> str:
    template = LABELS.get(fact.code, fact.code.replace("_", " "))
    kg = _num(round(fact.numeric_value / 1000, 2)) if fact.numeric_value else "?"
    text = template.format(n=_num(fact.numeric_value), kg=kg)
    return text if fact.present else f"no {text}"


def describe_facts(facts: list[Fact]) -> list[str]:
    """Merge BP systolic/diastolic into 'BP 150 over 100'."""
    sys_f = next((f for f in facts if f.code == "bp_systolic" and f.present), None)
    dia_f = next((f for f in facts if f.code == "bp_diastolic" and f.present), None)
    out: list[str] = []
    for f in facts:
        if f.code in ("bp_systolic", "bp_diastolic") and sys_f and dia_f:
            if f is sys_f:
                out.append(f"BP {_num(sys_f.numeric_value)} over {_num(dia_f.numeric_value)}")
            continue
        out.append(describe(f))
    return out


def join_words(items: list[str]) -> str:
    return ", ".join(i for i in items if i)


CLARIFY_QUESTIONS: dict[str, str] = {
    "pads_soaked_count": "How many pads or cloths have you changed since morning?",
    "bp_systolic": "Could you tell me the BP numbers again, slowly?",
    "bp_diastolic": "Could you tell me the BP numbers again, slowly?",
    "breaths_per_minute": "Shall we count the baby's breaths together for one minute?",
    "wet_nappies_count": "How many wet nappies has the baby had since yesterday this time?",
    "weight_grams": "Could you tell me the baby's weight again?",
    "not_feeding": "Is the baby drinking no milk at all, or drinking less than usual?",
    "feeding_poor": "Is the baby drinking no milk at all, or drinking less than usual?",
    "unconscious": "Did she faint and wake up, or is she not waking up now?",
    "dizziness_fainting": "Did she faint and wake up, or is she not waking up now?",
    "jaundice_face_body": "Please look at the baby's palms and soles. Are they yellow?",
}
DEFAULT_CLARIFY = "Could you tell me that again?"


def clarify_question(codes: list[str]) -> str | None:
    for c in codes:
        if c in CLARIFY_QUESTIONS:
            return CLARIFY_QUESTIONS[c]
    return DEFAULT_CLARIFY if codes else None

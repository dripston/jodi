"""Deterministic lexicon-based extractor — the offline mock for Sarvam-105B extraction.

Built from docs/phrase-lexicon.md (draft phrases) plus simple English equivalents and
number parsing. Used when SARVAM_MOCK=true and in tests. Same output shape as the LLM
(contracts §3). Low-confidence cases follow the lexicon notes ("confirm: none at all vs
less", "ask which") so the pipeline asks again instead of guessing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from app.domain.safety_net import BABY_WORDS
from app.domain.transcript import caller_text

NUMBER_WORDS: dict[str, int] = {
    # Kannada
    "ondu": 1, "eradu": 2, "yeradu": 2, "mooru": 3, "naalku": 4, "nalku": 4, "aidu": 5,
    "aaru": 6, "elu": 7, "yelu": 7, "entu": 8, "yentu": 8, "ombattu": 9, "hattu": 10,
    # Hindi
    "ek": 1, "do": 2, "teen": 3, "chaar": 4, "char": 4, "paanch": 5, "panch": 5, "chhe": 6,
    "che": 6, "saat": 7, "aath": 8, "nau": 9, "das": 10,
    # English
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10,
}  # fmt: skip
KN_TENS = {"ippattu": 20, "muvattu": 30, "nalavattu": 40, "aivattu": 50, "aravattu": 60,
           "eppattu": 70, "embattu": 80, "tombattu": 90}  # fmt: skip
NUM = r"(\d+|" + "|".join(sorted(NUMBER_WORDS, key=len, reverse=True)) + r")"

_BABY = re.compile(rf"(?<!\w)({'|'.join(BABY_WORDS)})(?!\w)", re.IGNORECASE)
_NEG_AFTER = re.compile(r"^\W{0,3}(illa|nahi|nahin|not)(?!\w)", re.IGNORECASE)
_NEG_BEFORE = re.compile(r"(?<!\w)(no|not|koi)\W{0,3}$", re.IGNORECASE)
_SENT = re.compile(r"(?:[!?।\n;]|\.(?!\d))+")

# (pattern, subject or None=infer, code, mother-context code for shared words, confidence)
PHRASES: list[tuple[str, str | None, str, float]] = [
    (r"ghante\s*(alli|mein).{0,30}(odde|geela|soak)|soaked\s+(with)?in\s+(an|one)\s+hour|pad\s+(full|soaked)\s+in\s+(an|one)\s+hour", "mother", "pad_soaked_within_hour", 0.9),
    (r"gadde|\bclots?\b", "mother", "clots_large", 0.8),
    (r"bahut\s+khoon|heavy\s+bleeding|bleeding\s+(a\s+lot|heavily|heavy)", "mother", "bleeding_heavy", 0.85),
    (r"tale\s+bhaara|tale\s+tumba\s+novu|sar\s+bhaari|sar\s+mein\s+bahut\s+dard|severe\s+headache|bad\s+headache|head\s+(is\s+)?heavy", "mother", "headache_severe", 0.85),
    (r"kannu\s+manju|lights?\s+blinking|kannu\s+mundhe\s+minchu|aankhon\s+ke\s+aage\s+(andhera|chamak)|blurr(ed|y)\s+vision", "mother", "vision_blurred", 0.85),
    (r"(mukha|kai)\s*(/\s*kai\s*)?\s*bandide|chehra\s+sooja|face\s+(is\s+)?swollen|swelling\s+(of|in)\s+(the\s+)?(face|hands)", "mother", "swelling_face_hands", 0.85),
    (r"\bjvara\b|bukhar|badan\s+garam|\bfever\b", "mother", "fever", 0.85),
    (r"maiyalli\s+bisi|\bgaram\b|\bfeels?\s+(very\s+)?hot\b|\bis\s+(very\s+)?hot\b", None, "fever|feels_hot", 0.8),
    (r"maiyalli\s+thanda|\bthanda\b|\bfeels?\s+(very\s+)?cold\b|\bis\s+(very\s+)?cold\b", None, "feels_cold", 0.8),
    (r"kettu\s+vaasane|badboo|foul[\s-]+smell", "mother", "discharge_foul", 0.85),
    (r"hotte\s+tumba\s+novu|pet\s+mein\s+bahut\s+dard|severe\s+(tummy|stomach|abdominal)\s+pain", "mother", "abdominal_pain_severe", 0.85),
    (r"holige\s+kempu|neeru\s+barutide|taanke\s+(laal|.{0,10}pani)|stitch(es)?\s+(is\s+|are\s+)?(red|oozing)", "mother", "wound_red_or_oozing", 0.85),
    (r"edhe\s+kempu|doodh\s+wali\s+jagah\s+laal|breast\s+(is\s+)?(red|painful)", "mother", "breast_red_painful", 0.85),
    (r"kaalu\s+oodhide|pindli|calf\s+(pain|swelling|swollen)", "mother", "calf_pain_swelling", 0.85),
    (r"usiru\s+kashta|saans\s+phool|breathless|short(ness)?\s+of\s+breath", None, "breathless|breathing_fast", 0.85),
    (r"chest\s+pain|edhe\s+novu|seene\s+mein\s+dard", "mother", "chest_pain", 0.85),
    (r"\bfits\b|jhatke|\bdaura\b", None, "fits", 0.9),
    (r"moorchhe|behosh", "mother", "unconscious", 0.5),  # lexicon: "ask which"
    (r"bp\s+maatre\s+nilsidini|bp\s+ki\s+dawai\s+band|stopped\s+(the\s+|my\s+)?bp\s+(medicine|tablets?)", "mother", "stopped_bp_medicine", 0.85),
    (r"iron.{0,20}(nilsidini|band|stopped)|stopped\s+(the\s+|my\s+)?iron", "mother", "stopped_iron", 0.85),
    (r"kammi\s+kudiyuttide|haalu\s+kammi|kam\s+pee\s+raha|feeding\s+(less|poorly)|drinking\s+less|less\s+milk", "baby", "feeding_poor", 0.85),
    (r"usiru\s+bega|tez\s+saans|breathing\s+(very\s+)?fast", "baby", "breathing_fast", 0.85),
    (r"chest\s+(is\s+)?(going|pulling|sinking)\s+in|indrawing", "baby", "chest_indrawing", 0.85),
    (r"tumba\s+nidre|eddelu\s+illa|bilkul\s+sust|lethargic|floppy", "baby", "lethargic", 0.8),
    (r"kai\s+kaalu\s+haladi|hatheli\s+talve\s+peele|(palms?|soles?).{0,20}yellow|yellow.{0,20}(palms?|soles?)", "baby", "jaundice_palms_soles", 0.85),
    (r"mukha\s+haladi|chehra\s+peela|(face|body|eyes)\s+(is\s+|are\s+|looks?\s+)?yellow|yellow\s+(face|body|eyes)", "baby", "jaundice_face_body", 0.85),
    (r"hokkalu\s+(kempu|keevu)|naal\s+(laal|mawad)|cord.{0,15}(red|pus)", "baby", "cord_red_or_pus", 0.85),
    (r"ella\s+vaanti|sab\s+ulti|vomit(s|ing)?\s+everything", "baby", "vomiting_everything", 0.85),
]  # fmt: skip

_NOT_FEEDING = re.compile(
    r"haalu\s+kudiyuttilla|doodh\s+nahi\s+pee|not\s+(drinking|feeding|taking)\s+(any\s+)?(milk|feeds?)|isn'?t\s+(drinking|feeding)",
    re.IGNORECASE,
)
_NOT_FEEDING_CONFIRMED = re.compile(r"at\s+all|bilkul|swalpa\s*(kooda|nu)|none|ella\s+kudiyuttilla", re.IGNORECASE)
_PADS = re.compile(rf"(?<!\w){NUM}\s+(batte|battegalu|kapde|kapda|cloths?|pads?)\b", re.IGNORECASE)
_BP = re.compile(r"(\d{2,3})\s*(?:/|over|by|upon|on)\s*(\d{2,3})", re.IGNORECASE)
_KG = re.compile(r"(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogram)s?\b", re.IGNORECASE)
_GRAMS = re.compile(r"(\d{4})\s*(?:g|grams?)\b", re.IGNORECASE)
_BREATHS = re.compile(r"(\d{2,3})\s*(?:breaths?|times|baari|sala)\b", re.IGNORECASE)
_NAPPIES = re.compile(rf"(?<!\w){NUM}\s+(wet\s+)?(nappies|nappy|diapers?|langot)\b", re.IGNORECASE)
_KN_NUMS = re.compile(r"nooru(?:\s+(" + "|".join(KN_TENS) + r"))?", re.IGNORECASE)
DISMISSAL = re.compile(
    r"normal\s+ide|ella\s+sari\s+ide|delivery\s+aadmele\s+heege|sab\s+theek\s+hai|aisa\s+hota\s+hai|chinta\s+mat\s+karo|it'?s\s+normal|it\s+is\s+normal|she'?s\s+fine|she\s+is\s+fine",
    re.IGNORECASE,
)


def _num(token: str) -> float | None:
    token = token.lower()
    if token.isdigit():
        return float(token)
    return float(NUMBER_WORDS[token]) if token in NUMBER_WORDS else None


@dataclass
class _Ctx:
    sentence: str
    baby: bool


def _fact(subject: str, code: str, quote: str, conf: float, present: bool = True,
          num: float | None = None, unit: str | None = None, value: str | None = None) -> dict[str, Any]:  # fmt: skip
    return {
        "subject": subject, "code": code, "present": present, "value": value,
        "numeric_value": num, "unit": unit, "quote": quote.strip()[:160], "confidence": conf,
    }  # fmt: skip


def _negated(sentence: str, start: int, end: int) -> bool:
    return bool(_NEG_AFTER.search(sentence[end:]) or _NEG_BEFORE.search(sentence[:start]))


def _resolve(code: str, subject: str | None, baby_ctx: bool) -> tuple[str, str]:
    if "|" in code:
        mother_code, baby_code = code.split("|")
        return ("baby", baby_code) if baby_ctx else ("mother", mother_code)
    if subject is None:
        return ("baby" if baby_ctx else "mother"), code
    return subject, code


def _phrase_facts(ctx: _Ctx) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for pattern, subject, code, conf in PHRASES:
        m = re.search(pattern, ctx.sentence, re.IGNORECASE)
        if not m:
            continue
        subj, real_code = _resolve(code, subject, ctx.baby)
        if code == "feels_cold" and not ctx.baby:
            continue  # "cold" about the mother is not a fact code
        present = not _negated(ctx.sentence, m.start(), m.end())
        out.append(_fact(subj, real_code, ctx.sentence, conf, present))
    return out


def _feeding_facts(ctx: _Ctx, full_text: str) -> list[dict[str, Any]]:
    if not _NOT_FEEDING.search(ctx.sentence):
        return []
    conf = 0.9 if _NOT_FEEDING_CONFIRMED.search(full_text) else 0.55
    return [_fact("baby", "not_feeding", ctx.sentence, conf)]


def _kn_bp(sentence: str) -> tuple[float, float] | None:
    if "bp" not in sentence.lower() and "nooru" not in sentence.lower():
        return None
    nums = [100 + KN_TENS.get((m.group(1) or "").lower(), 0) for m in _KN_NUMS.finditer(sentence)]
    return (float(nums[0]), float(nums[1])) if len(nums) >= 2 else None


def _numeric_facts(ctx: _Ctx) -> list[dict[str, Any]]:
    s, out = ctx.sentence, []
    for m in _PADS.finditer(s):
        n = _num(m.group(1))
        if n is not None:
            out.append(_fact("mother", "pads_soaked_count", s, 0.85, num=n, unit="pads"))
    bp = _BP.search(s)
    if bp:
        out += [_fact("mother", "bp_systolic", s, 0.85, num=float(bp.group(1)), unit="mmHg"),
                _fact("mother", "bp_diastolic", s, 0.85, num=float(bp.group(2)), unit="mmHg")]  # fmt: skip
    elif (kn := _kn_bp(s)) is not None:
        out += [_fact("mother", "bp_systolic", s, 0.65, num=kn[0], unit="mmHg"),
                _fact("mother", "bp_diastolic", s, 0.65, num=kn[1], unit="mmHg")]  # fmt: skip
    if kg := _KG.search(s):
        out.append(_fact("baby", "weight_grams", s, 0.85, num=round(float(kg.group(1)) * 1000), unit="g"))
    elif g := _GRAMS.search(s):
        out.append(_fact("baby", "weight_grams", s, 0.85, num=float(g.group(1)), unit="g"))
    if (br := _BREATHS.search(s)) and (ctx.baby or "breath" in s.lower() or "usiru" in s.lower()):
        out.append(_fact("baby", "breaths_per_minute", s, 0.85, num=float(br.group(1)), unit="per_minute"))
    for m in _NAPPIES.finditer(s):
        n = _num(m.group(1))
        if n is not None:
            out.append(_fact("baby", "wet_nappies_count", s, 0.8, num=n, unit="nappies"))
    return out


def _dedupe(facts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: dict[tuple[str, str, Any], dict[str, Any]] = {}
    for f in facts:
        seen.setdefault((f["subject"], f["code"], f["numeric_value"]), f)
    return list(seen.values())


def extract(transcript: str) -> dict[str, Any]:
    text = caller_text(transcript)
    facts: list[dict[str, Any]] = []
    for sentence in (s.strip() for s in _SENT.split(text)):
        if not sentence:
            continue
        ctx = _Ctx(sentence, bool(_BABY.search(sentence)))
        facts += _phrase_facts(ctx) + _feeding_facts(ctx, text) + _numeric_facts(ctx)
    facts = _dedupe(facts)
    unclear = [f["code"] for f in facts if f["confidence"] < 0.6]
    return {
        "facts": facts,
        "dismissal_detected": bool(DISMISSAL.search(text)),
        "needs_clarification": unclear,
    }

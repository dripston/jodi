"""Clinical rules engine — implements docs/clinical-rules.md (DRAFT) exactly. Pure.

AI understands, rules decide, humans confirm: nothing here calls an LLM, the DB or the clock.
Order: individual mother/baby rules → keyword safety net → dyad rules → history rules →
dismissal rule (never lowers a level).
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from typing import Literal

from app.domain.facts import Fact

RULES_VERSION = "clinical-rules-draft-2026-11-13"

Level = Literal["green", "amber", "red"]
RuleSubject = Literal["mother", "baby"]
_RANK: dict[str, int] = {"green": 0, "amber": 1, "red": 2}

HIGH_BP_COMPLICATIONS = frozenset(
    {"high_bp_in_pregnancy", "pre_eclampsia", "preeclampsia", "eclampsia",
     "gestational_hypertension", "chronic_hypertension"}
)  # fmt: skip

FITS_RULES = frozenset({"M-FITS-01", "B-FITS-01", "K-SAFETY-01"})


def max_level(*levels: str) -> Level:
    return max(levels, key=lambda lv: _RANK[lv])  # type: ignore[return-value]


def raise_one(level: str) -> Level:
    return "red" if level in ("amber", "red") else "amber"


def level_rank(level: str) -> int:
    return _RANK[level]


@dataclass(frozen=True)
class Profile:
    complications: tuple[str, ...] = ()
    day_since_delivery: int = 0
    baby_age_hours: float = 0.0

    @property
    def has_high_bp(self) -> bool:
        return any(c in HIGH_BP_COMPLICATIONS for c in self.complications)


class FactView:
    """Query helper over the current facts (only `present = true` facts count)."""

    def __init__(self, facts: Iterable[Fact]) -> None:
        self._present: set[tuple[str, str]] = set()
        self._nums: dict[tuple[str, str], list[float]] = {}
        for f in facts:
            if not f.present:
                continue
            self._present.add((f.subject, f.code))
            if f.numeric_value is not None:
                self._nums.setdefault((f.subject, f.code), []).append(f.numeric_value)

    def m(self, code: str) -> bool:
        return ("mother", code) in self._present

    def b(self, code: str) -> bool:
        return ("baby", code) in self._present

    def num_max(self, subject: str, code: str) -> float | None:
        vals = self._nums.get((subject, code))
        return max(vals) if vals else None

    def num_min(self, subject: str, code: str) -> float | None:
        vals = self._nums.get((subject, code))
        return min(vals) if vals else None

    def bp_high(self, sys_at: float, dia_at: float) -> bool:
        s = self.num_max("mother", "bp_systolic")
        d = self.num_max("mother", "bp_diastolic")
        return (s is not None and s >= sys_at) or (d is not None and d >= dia_at)


@dataclass(frozen=True)
class FiredRule:
    rule_id: str
    subject: RuleSubject
    level: Level
    reason: str


@dataclass
class Assessment:
    mother_level: Level = "green"
    baby_level: Level = "green"
    fired: list[FiredRule] = field(default_factory=list)
    rules_version: str = RULES_VERSION
    dismissed_by_family: bool = False
    recheck_hours: int | None = None
    asha_task: bool = False
    reminders: list[str] = field(default_factory=list)

    @property
    def overall_level(self) -> Level:
        return max_level(self.mother_level, self.baby_level)

    @property
    def rule_ids(self) -> list[str]:
        seen: list[str] = []
        for r in self.fired:
            if r.rule_id not in seen:
                seen.append(r.rule_id)
        return seen

    @property
    def reason_text(self) -> str:
        parts = [r.reason for r in self.fired if r.level != "green" or r.rule_id == "M-MED-02"]
        return "; ".join(dict.fromkeys(parts))

    @property
    def subjects(self) -> list[str]:
        out = []
        if self.mother_level != "green":
            out.append("mother")
        if self.baby_level != "green":
            out.append("baby")
        return out

    def bump(self, subject: str, level: str) -> None:
        if subject == "mother":
            self.mother_level = max_level(self.mother_level, level)
        else:
            self.baby_level = max_level(self.baby_level, level)

    def level_of(self, subject: str) -> Level:
        return self.mother_level if subject == "mother" else self.baby_level


@dataclass(frozen=True)
class AssessmentInput:
    facts: tuple[Fact, ...]
    profile: Profile = Profile()
    previous_rule_ids: frozenset[str] = frozenset()
    consecutive_missed_calls: int = 0
    dismissal_detected: bool = False
    safety_net_subject: RuleSubject | None = None  # set when K-SAFETY-01 fired


Predicate = Callable[[FactView, Profile], bool]


# ---------------------------------------------------------------- mother rules
def _bleed01(v: FactView, _: Profile) -> bool:
    return v.m("pad_soaked_within_hour") or v.m("clots_large") or (v.m("bleeding_heavy") and v.m("dizziness_fainting"))


def _bleed02(v: FactView, p: Profile) -> bool:
    pads = v.num_max("mother", "pads_soaked_count")
    heavy_alone = v.m("bleeding_heavy") and not _bleed01(v, p)
    return heavy_alone or (pads is not None and pads >= 4)


def _htn01(v: FactView, _: Profile) -> bool:
    return v.m("headache_severe") and (v.m("vision_blurred") or v.m("swelling_face_hands"))


def _htn02(v: FactView, _: Profile) -> bool:
    return v.bp_high(160, 110)


def _htn03(v: FactView, _: Profile) -> bool:
    return v.bp_high(140, 90) and (v.m("headache_severe") or v.m("vision_blurred"))


def _htn04(v: FactView, _: Profile) -> bool:
    no_symptoms = not v.m("headache_severe") and not v.m("vision_blurred")
    return v.bp_high(140, 90) and no_symptoms


def _htn05(v: FactView, p: Profile) -> bool:
    symptom = v.m("headache_severe") or v.m("vision_blurred")
    return symptom and not _htn01(v, p) and not _htn03(v, p)


def _sepsis01(v: FactView, _: Profile) -> bool:
    return v.m("fever") and (v.m("discharge_foul") or v.m("abdominal_pain_severe"))


def _wound02(v: FactView, _: Profile) -> bool:
    return v.m("wound_red_or_oozing") and v.m("fever")


def _fever01(v: FactView, p: Profile) -> bool:
    return v.m("fever") and not _sepsis01(v, p) and not _wound02(v, p)


MOTHER_RULES: list[tuple[str, Level, Predicate, str]] = [
    ("M-BLEED-01", "red", _bleed01, "Heavy bleeding (pad soaked within an hour, large clots, or heavy bleeding with dizziness)"),
    ("M-BLEED-02", "amber", _bleed02, "Heavy bleeding or 4+ pads soaked since morning"),
    ("M-HTN-01", "red", _htn01, "Severe headache with blurred vision or face/hand swelling"),
    ("M-HTN-02", "red", _htn02, "BP 160/110 or higher"),
    ("M-HTN-03", "red", _htn03, "BP 140/90 or higher with severe headache or blurred vision"),
    ("M-HTN-04", "amber", _htn04, "BP 140/90 or higher"),
    ("M-HTN-05", "amber", _htn05, "Severe headache or blurred vision"),
    ("M-FITS-01", "red", lambda v, _: v.m("fits") or v.m("unconscious"), "Mother had fits or is unconscious"),
    ("M-SEPSIS-01", "red", _sepsis01, "Fever with foul discharge or severe abdominal pain"),
    ("M-FEVER-01", "amber", _fever01, "Mother has fever"),
    ("M-WOUND-01", "amber", lambda v, _: v.m("wound_red_or_oozing") and not v.m("fever"), "Stitches red or oozing"),
    ("M-WOUND-02", "red", _wound02, "Stitches red or oozing with fever"),
    ("M-BREAST-01", "amber", lambda v, _: v.m("breast_red_painful"), "Breast red and painful"),
    ("M-CLOT-01", "red", lambda v, _: v.m("breathless") or v.m("chest_pain"), "Breathlessness or chest pain"),
    ("M-CLOT-02", "amber", lambda v, _: v.m("calf_pain_swelling"), "Calf pain or swelling"),
    ("M-MED-01", "amber", lambda v, p: v.m("stopped_bp_medicine") and p.has_high_bp, "Stopped BP medicine (high-BP profile)"),
    ("M-MED-02", "green", lambda v, _: v.m("stopped_iron"), "Stopped iron tablets (reminder)"),
]  # fmt: skip


# ------------------------------------------------------------------ baby rules
def _breath01(v: FactView, _: Profile) -> bool:
    bpm = v.num_max("baby", "breaths_per_minute")
    return v.b("breathing_fast") or (bpm is not None and bpm >= 60)


def _wet01(v: FactView, p: Profile) -> bool:
    wet = v.num_min("baby", "wet_nappies_count")
    return wet is not None and wet < 6 and p.day_since_delivery > 5


BABY_RULES: list[tuple[str, Level, Predicate, str]] = [
    ("B-FEED-01", "red", lambda v, _: v.b("not_feeding"), "Baby not feeding"),
    ("B-FITS-01", "red", lambda v, _: v.b("fits"), "Baby had fits"),
    ("B-BREATH-01", "red", _breath01, "Baby breathing fast (60+ per minute)"),
    ("B-BREATH-02", "red", lambda v, _: v.b("chest_indrawing"), "Baby chest indrawing"),
    ("B-TEMP-01", "red", lambda v, _: v.b("feels_hot") or v.b("feels_cold"), "Baby feels hot or cold"),
    ("B-ACT-01", "red", lambda v, _: v.b("lethargic"), "Baby lethargic"),
    ("B-JAUN-01", "red", lambda v, _: v.b("jaundice_palms_soles"), "Yellow palms or soles"),
    ("B-JAUN-02", "red", lambda v, p: v.b("jaundice_face_body") and p.baby_age_hours < 24, "Yellow face/body in first 24 hours"),
    ("B-JAUN-03", "amber", lambda v, p: v.b("jaundice_face_body") and p.baby_age_hours >= 24, "Yellow face/body"),
    ("B-CORD-01", "amber", lambda v, _: v.b("cord_red_or_pus"), "Cord red or with pus"),
    ("B-VOMIT-01", "red", lambda v, _: v.b("vomiting_everything"), "Baby vomiting everything"),
    ("B-FEED-02", "amber", lambda v, _: v.b("feeding_poor"), "Baby feeding poorly"),
    ("B-WET-01", "amber", _wet01, "Fewer than 6 wet nappies in 24 h after day 5"),
]  # fmt: skip

ALL_RULE_IDS: tuple[str, ...] = tuple(
    [r[0] for r in MOTHER_RULES]
    + [r[0] for r in BABY_RULES]
    + ["D-INF-01", "D-FEED-01", "D-JAUN-01", "H-REPEAT-01", "H-MISSED-01", "X-DISMISS-01", "K-SAFETY-01"]
)  # fmt: skip

AMBER_INDIVIDUAL_RULES = frozenset(r[0] for r in MOTHER_RULES + BABY_RULES if r[1] == "amber")


def _apply_individual(a: Assessment, v: FactView, p: Profile) -> None:
    for subject, table in (("mother", MOTHER_RULES), ("baby", BABY_RULES)):
        for rule_id, level, pred, reason in table:
            if pred(v, p):
                a.fired.append(FiredRule(rule_id, subject, level, reason))  # type: ignore[arg-type]
                a.bump(subject, level)
                if rule_id == "M-MED-02":
                    a.reminders.append("iron")


def _apply_safety_net(a: Assessment, subject: RuleSubject | None) -> None:
    if subject is None:
        return
    a.fired.append(
        FiredRule("K-SAFETY-01", subject, "red", "Danger keyword heard (fits / unconscious / not breathing)")
    )
    a.bump(subject, "red")


def _apply_dyad(a: Assessment, v: FactView) -> None:
    if v.m("fever") and (v.b("feeding_poor") or v.b("feels_hot") or v.b("lethargic")):
        a.mother_level = raise_one(a.mother_level)
        a.baby_level = raise_one(a.baby_level)
        a.fired.append(
            FiredRule("D-INF-01", "mother", a.mother_level, "Mother fever with baby unwell (pair raised one level)")
        )
    if v.m("breast_red_painful") and v.b("feeding_poor"):
        a.bump("baby", "amber")
        a.recheck_hours = 6
        a.fired.append(
            FiredRule("D-FEED-01", "baby", "amber", "Breast problem with baby feeding poorly (recheck in 6 h)")
        )
    if v.b("feeding_poor") and (v.b("jaundice_face_body") or v.b("jaundice_palms_soles")):
        a.bump("baby", "red")
        a.fired.append(FiredRule("D-JAUN-01", "baby", "red", "Baby feeding poorly with jaundice"))


def _apply_history(a: Assessment, previous: frozenset[str], missed: int) -> None:
    repeated = [r for r in a.fired if r.rule_id in AMBER_INDIVIDUAL_RULES and r.rule_id in previous]
    for subject in ("mother", "baby"):
        if any(r.subject == subject for r in repeated):
            new = raise_one(a.level_of(subject))
            if subject == "mother":
                a.mother_level = new
            else:
                a.baby_level = new
            a.fired.append(FiredRule("H-REPEAT-01", subject, new, "Same amber sign as last check (raised one level)"))  # type: ignore[arg-type]
    if missed >= 2:
        a.bump("mother", "amber")
        a.asha_task = True
        a.fired.append(FiredRule("H-MISSED-01", "mother", "amber", "2 scheduled calls unanswered (ASHA visit needed)"))


def _apply_dismissal(a: Assessment, dismissal: bool) -> None:
    if dismissal and a.overall_level != "green":
        a.dismissed_by_family = True
        subject: RuleSubject = "mother" if a.mother_level != "green" else "baby"
        a.fired.append(
            FiredRule("X-DISMISS-01", subject, a.level_of(subject), "Family played down the sign (level kept)")
        )


def assess(inp: AssessmentInput) -> Assessment:
    """Apply every rule in docs/clinical-rules.md to the current facts."""
    view = FactView(inp.facts)
    a = Assessment()
    _apply_individual(a, view, inp.profile)
    _apply_safety_net(a, inp.safety_net_subject)
    _apply_dyad(a, view)
    _apply_history(a, inp.previous_rule_ids, inp.consecutive_missed_calls)
    _apply_dismissal(a, inp.dismissal_detected)
    return a


# Fact codes each rule reads, per subject: lets the timeline show which rules a recorded fact triggered.
# Keep in step with the predicates above (tests/domain check every individual and dyad rule is listed).
RULE_FACT_CODES: dict[str, dict[str, frozenset[str]]] = {
    "M-BLEED-01": {"mother": frozenset({"pad_soaked_within_hour", "clots_large", "bleeding_heavy", "dizziness_fainting"})},
    "M-BLEED-02": {"mother": frozenset({"bleeding_heavy", "pads_soaked_count"})},
    "M-HTN-01": {"mother": frozenset({"headache_severe", "vision_blurred", "swelling_face_hands"})},
    "M-HTN-02": {"mother": frozenset({"bp_systolic", "bp_diastolic"})},
    "M-HTN-03": {"mother": frozenset({"bp_systolic", "bp_diastolic", "headache_severe", "vision_blurred"})},
    "M-HTN-04": {"mother": frozenset({"bp_systolic", "bp_diastolic"})},
    "M-HTN-05": {"mother": frozenset({"headache_severe", "vision_blurred"})},
    "M-FITS-01": {"mother": frozenset({"fits", "unconscious"})},
    "M-SEPSIS-01": {"mother": frozenset({"fever", "discharge_foul", "abdominal_pain_severe"})},
    "M-FEVER-01": {"mother": frozenset({"fever"})},
    "M-WOUND-01": {"mother": frozenset({"wound_red_or_oozing"})},
    "M-WOUND-02": {"mother": frozenset({"wound_red_or_oozing", "fever"})},
    "M-BREAST-01": {"mother": frozenset({"breast_red_painful"})},
    "M-CLOT-01": {"mother": frozenset({"breathless", "chest_pain"})},
    "M-CLOT-02": {"mother": frozenset({"calf_pain_swelling"})},
    "M-MED-01": {"mother": frozenset({"stopped_bp_medicine"})},
    "M-MED-02": {"mother": frozenset({"stopped_iron"})},
    "B-FEED-01": {"baby": frozenset({"not_feeding"})},
    "B-FITS-01": {"baby": frozenset({"fits"})},
    "B-BREATH-01": {"baby": frozenset({"breathing_fast", "breaths_per_minute"})},
    "B-BREATH-02": {"baby": frozenset({"chest_indrawing"})},
    "B-TEMP-01": {"baby": frozenset({"feels_hot", "feels_cold"})},
    "B-ACT-01": {"baby": frozenset({"lethargic"})},
    "B-JAUN-01": {"baby": frozenset({"jaundice_palms_soles"})},
    "B-JAUN-02": {"baby": frozenset({"jaundice_face_body"})},
    "B-JAUN-03": {"baby": frozenset({"jaundice_face_body"})},
    "B-CORD-01": {"baby": frozenset({"cord_red_or_pus"})},
    "B-VOMIT-01": {"baby": frozenset({"vomiting_everything"})},
    "B-FEED-02": {"baby": frozenset({"feeding_poor"})},
    "B-WET-01": {"baby": frozenset({"wet_nappies_count"})},
    "D-INF-01": {"mother": frozenset({"fever"}), "baby": frozenset({"feeding_poor", "feels_hot", "lethargic"})},
    "D-FEED-01": {"mother": frozenset({"breast_red_painful"}), "baby": frozenset({"feeding_poor"})},
    "D-JAUN-01": {"baby": frozenset({"feeding_poor", "jaundice_face_body", "jaundice_palms_soles"})},
}  # fmt: skip


def rules_for_fact(subject: str, code: str | None, fired_rule_ids: Iterable[str]) -> list[str]:
    """The fired rules (in firing order) that read this fact. History/dismissal/keyword rules are not per-fact."""
    if not code:
        return []
    return [r for r in fired_rule_ids if code in RULE_FACT_CODES.get(r, {}).get(subject, frozenset())]

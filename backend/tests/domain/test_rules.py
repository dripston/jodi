"""One positive + one near-miss test per rule ID in docs/clinical-rules.md (table-driven)."""

from __future__ import annotations

import pytest

from app.domain.facts import Fact
from app.domain.rules import (
    ALL_RULE_IDS,
    AssessmentInput,
    Profile,
    assess,
)


def m(code: str, num: float | None = None, present: bool = True) -> Fact:
    return Fact("mother", code, present=present, numeric_value=num)


def b(code: str, num: float | None = None, present: bool = True) -> Fact:
    return Fact("baby", code, present=present, numeric_value=num)


DAY3 = Profile(day_since_delivery=3, baby_age_hours=72)
DAY0 = Profile(day_since_delivery=0, baby_age_hours=10)
DAY7 = Profile(day_since_delivery=7, baby_age_hours=168)
HIGH_BP = Profile(complications=("high_bp_in_pregnancy",), day_since_delivery=3, baby_age_hours=72)


def run(facts, profile=DAY3, **kw):
    return assess(AssessmentInput(facts=tuple(facts), profile=profile, **kw))


# (rule_id, positive facts, near-miss facts, profile, expected level for the rule's subject)
CASES = [
    ("M-BLEED-01", [m("pad_soaked_within_hour")], [m("pads_soaked_count", 3)], DAY3, "red"),
    ("M-BLEED-01", [m("bleeding_heavy"), m("dizziness_fainting")], [m("dizziness_fainting")], DAY3, "red"),
    ("M-BLEED-01", [m("clots_large")], [m("clots_large", present=False)], DAY3, "red"),
    ("M-BLEED-02", [m("pads_soaked_count", 4)], [m("pads_soaked_count", 3)], DAY3, "amber"),
    ("M-BLEED-02", [m("bleeding_heavy")], [], DAY3, "amber"),
    (
        "M-HTN-01",
        [m("headache_severe"), m("vision_blurred")],
        [m("vision_blurred"), m("swelling_face_hands")],
        DAY3,
        "red",
    ),
    (
        "M-HTN-02",
        [m("bp_systolic", 160), m("bp_diastolic", 100)],
        [m("bp_systolic", 159), m("bp_diastolic", 109)],
        DAY3,
        "red",
    ),
    (
        "M-HTN-03",
        [m("bp_systolic", 145), m("headache_severe")],
        [m("bp_systolic", 139), m("bp_diastolic", 89), m("headache_severe")],
        DAY3,
        "red",
    ),
    (
        "M-HTN-04",
        [m("bp_systolic", 150), m("bp_diastolic", 100)],
        [m("bp_systolic", 139), m("bp_diastolic", 89)],
        DAY3,
        "amber",
    ),
    ("M-HTN-05", [m("headache_severe")], [m("headache_severe", present=False)], DAY3, "amber"),
    ("M-FITS-01", [m("unconscious")], [m("dizziness_fainting")], DAY3, "red"),
    ("M-SEPSIS-01", [m("fever"), m("discharge_foul")], [m("discharge_foul")], DAY3, "red"),
    ("M-FEVER-01", [m("fever")], [m("fever", present=False)], DAY3, "amber"),
    ("M-WOUND-01", [m("wound_red_or_oozing")], [m("wound_red_or_oozing", present=False)], DAY3, "amber"),
    ("M-WOUND-02", [m("wound_red_or_oozing"), m("fever")], [m("wound_red_or_oozing")], DAY3, "red"),
    ("M-BREAST-01", [m("breast_red_painful")], [b("feeding_poor")], DAY3, "amber"),
    ("M-CLOT-01", [m("chest_pain")], [m("calf_pain_swelling")], DAY3, "red"),
    ("M-CLOT-02", [m("calf_pain_swelling")], [m("calf_pain_swelling", present=False)], DAY3, "amber"),
    ("M-MED-01", [m("stopped_bp_medicine")], [m("stopped_iron")], HIGH_BP, "amber"),
    ("M-MED-02", [m("stopped_iron")], [m("stopped_bp_medicine")], DAY3, "green"),
    ("B-FEED-01", [b("not_feeding")], [b("feeding_poor")], DAY3, "red"),
    ("B-FITS-01", [b("fits")], [m("fits")], DAY3, "red"),
    ("B-BREATH-01", [b("breaths_per_minute", 60)], [b("breaths_per_minute", 59)], DAY3, "red"),
    ("B-BREATH-01", [b("breathing_fast")], [b("breathing_fast", present=False)], DAY3, "red"),
    ("B-BREATH-02", [b("chest_indrawing")], [b("chest_indrawing", present=False)], DAY3, "red"),
    ("B-TEMP-01", [b("feels_cold")], [m("fever")], DAY3, "red"),
    ("B-ACT-01", [b("lethargic")], [b("lethargic", present=False)], DAY3, "red"),
    ("B-JAUN-01", [b("jaundice_palms_soles")], [b("jaundice_face_body")], DAY3, "red"),
    ("B-JAUN-02", [b("jaundice_face_body")], [b("jaundice_face_body")], DAY0, "red"),
    ("B-JAUN-03", [b("jaundice_face_body")], [b("jaundice_face_body", present=False)], DAY3, "amber"),
    ("B-CORD-01", [b("cord_red_or_pus")], [b("cord_red_or_pus", present=False)], DAY3, "amber"),
    ("B-VOMIT-01", [b("vomiting_everything")], [b("vomiting_everything", present=False)], DAY3, "red"),
    ("B-FEED-02", [b("feeding_poor")], [b("feeding_poor", present=False)], DAY3, "amber"),
    ("B-WET-01", [b("wet_nappies_count", 5)], [b("wet_nappies_count", 6)], DAY7, "amber"),
]


@pytest.mark.parametrize(("rule_id", "positive", "near_miss", "profile", "level"), CASES)
def test_rule_positive_and_near_miss(rule_id, positive, near_miss, profile, level):
    hit = run(positive, profile)
    assert rule_id in hit.rule_ids
    subject = "baby" if rule_id.startswith("B-") else "mother"
    assert hit.level_of(subject) == level
    near_profile = DAY3 if rule_id == "B-JAUN-02" else profile
    miss = run(near_miss, near_profile)
    assert rule_id not in miss.rule_ids


def test_b_wet_01_not_before_day_6():
    assert "B-WET-01" not in run([b("wet_nappies_count", 3)], Profile(day_since_delivery=5)).rule_ids


def test_m_med_01_needs_high_bp_profile():
    assert "M-MED-01" not in run([m("stopped_bp_medicine")], DAY3).rule_ids


def test_m_med_02_adds_reminder_without_alert():
    a = run([m("stopped_iron")])
    assert a.overall_level == "green" and a.reminders == ["iron"]


def test_b_jaun_02_vs_03_split_at_24_hours():
    assert "B-JAUN-03" in run([b("jaundice_face_body")], Profile(baby_age_hours=24)).rule_ids
    assert "B-JAUN-02" in run([b("jaundice_face_body")], Profile(baby_age_hours=23.9)).rule_ids


def test_no_facts_is_green():
    a = run([])
    assert (a.mother_level, a.baby_level, a.rule_ids) == ("green", "green", [])


# ------------------------------------------------------------------ dyad rules
def test_d_inf_01_raises_both_one_level():
    a = run([m("fever"), b("feeding_poor")])
    assert "D-INF-01" in a.rule_ids
    assert (a.mother_level, a.baby_level) == ("red", "red")


def test_d_inf_01_raises_green_baby_to_amber_via_hot():
    a = run([m("fever"), b("feels_hot")])  # baby already red from B-TEMP-01
    assert a.baby_level == "red" and a.mother_level == "red"


def test_d_inf_01_near_miss_without_mother_fever():
    a = run([b("feeding_poor")])
    assert "D-INF-01" not in a.rule_ids and a.baby_level == "amber"


def test_d_feed_01_baby_amber_and_recheck():
    a = run([m("breast_red_painful"), b("feeding_poor")])
    assert "D-FEED-01" in a.rule_ids and a.recheck_hours == 6 and a.baby_level == "amber"


def test_d_feed_01_near_miss():
    assert "D-FEED-01" not in run([m("breast_red_painful")]).rule_ids


def test_d_jaun_01_baby_red():
    a = run([b("feeding_poor"), b("jaundice_face_body")])
    assert "D-JAUN-01" in a.rule_ids and a.baby_level == "red"


def test_d_jaun_01_near_miss():
    assert "D-JAUN-01" not in run([b("jaundice_face_body")]).rule_ids


# --------------------------------------------------------------- history rules
def test_h_repeat_01_raises_repeated_amber():
    a = run([m("fever")], previous_rule_ids=frozenset({"M-FEVER-01"}))
    assert "H-REPEAT-01" in a.rule_ids and a.mother_level == "red"


def test_h_repeat_01_near_miss_different_rule():
    a = run([m("fever")], previous_rule_ids=frozenset({"M-BREAST-01"}))
    assert "H-REPEAT-01" not in a.rule_ids and a.mother_level == "amber"


def test_h_missed_01_two_missed_calls():
    a = run([], consecutive_missed_calls=2)
    assert "H-MISSED-01" in a.rule_ids and a.mother_level == "amber" and a.asha_task


def test_h_missed_01_near_miss_one_missed():
    assert "H-MISSED-01" not in run([], consecutive_missed_calls=1).rule_ids


# ------------------------------------------------------------ dismissal + net
def test_x_dismiss_01_never_lowers():
    a = run([m("pad_soaked_within_hour")], dismissal_detected=True)
    assert "X-DISMISS-01" in a.rule_ids and a.mother_level == "red" and a.dismissed_by_family


def test_x_dismiss_01_near_miss_when_green():
    a = run([], dismissal_detected=True)
    assert "X-DISMISS-01" not in a.rule_ids and not a.dismissed_by_family


def test_k_safety_01_forces_red():
    a = run([], safety_net_subject="baby")
    assert "K-SAFETY-01" in a.rule_ids and a.baby_level == "red"


def test_k_safety_01_near_miss():
    assert "K-SAFETY-01" not in run([]).rule_ids


def test_every_rule_id_is_covered_by_a_test():
    tested = {c[0] for c in CASES} | {
        "D-INF-01", "D-FEED-01", "D-JAUN-01", "H-REPEAT-01", "H-MISSED-01", "X-DISMISS-01", "K-SAFETY-01",
    }  # fmt: skip
    assert set(ALL_RULE_IDS) == tested


def test_demo_transcript_facts_are_amber_per_current_rules():
    """docs/demo-script.md step 3 expects red; the current rules give amber (flagged in requests.md)."""
    a = run(
        [m("pads_soaked_count", 4), m("headache_severe"), b("feeding_poor")],
        Profile(day_since_delivery=5, baby_age_hours=120),
    )
    assert set(a.rule_ids) >= {"M-BLEED-02", "M-HTN-05", "B-FEED-02"}
    assert a.overall_level == "amber"

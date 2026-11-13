from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest

from app.core.errors import InvalidTransition
from app.core.time import is_quiet_hours, next_allowed_time
from app.domain import access, escalation, facilities, scheduling

NOW = datetime(2026, 11, 13, 4, 0, tzinfo=UTC)  # 09:30 IST


# ----------------------------------------------------------------- escalation
def test_state_machine_happy_path():
    for a, b in [
        ("open", "notified"),
        ("notified", "acknowledged"),
        ("acknowledged", "reached"),
        ("reached", "closed"),
    ]:
        escalation.check_transition(a, b)


@pytest.mark.parametrize(
    ("a", "b"), [("open", "closed"), ("notified", "closed"), ("closed", "open"), ("reached", "notified")]
)
def test_invalid_transitions(a, b):
    with pytest.raises(InvalidTransition):
        escalation.check_transition(a, b)


def test_escalation_timers():
    assert escalation.escalation_due_at("red", NOW) == NOW + timedelta(minutes=10)
    assert escalation.escalation_due_at("amber", NOW) == NOW + timedelta(minutes=60)


def test_upgrade_keeps_sooner_deadline():
    amber_due = NOW + timedelta(minutes=50)
    assert escalation.next_escalation_after_update(amber_due, "red", NOW) == NOW + timedelta(minutes=10)


def test_escalation_due_only_before_ack():
    due = NOW - timedelta(seconds=1)
    assert escalation.is_escalation_due("notified", due, NOW)
    assert not escalation.is_escalation_due("acknowledged", due, NOW)


def test_close_needs_reached_and_later_non_red():
    reached = NOW
    assert escalation.can_close("reached", reached, NOW + timedelta(minutes=1), "amber")
    assert not escalation.can_close("reached", reached, NOW + timedelta(minutes=1), "red")
    assert not escalation.can_close("reached", reached, NOW - timedelta(minutes=1), "green")
    assert not escalation.can_close("notified", None, NOW, "green")


def test_escalation_chain_order():
    chain = escalation.escalation_chain([("+2", False), ("+1", True)], "a_001")
    assert chain == ["+1", "+2", "asha:a_001", "anm:placeholder"]
    assert escalation.next_contact(chain, ["+1"]) == "+2"


# ----------------------------------------------------------------- scheduling
def test_high_risk_profile():
    assert scheduling.is_high_risk("c_section", [], 3000, 39)
    assert scheduling.is_high_risk("normal", ["high_bp_in_pregnancy"], 3000, 39)
    assert scheduling.is_high_risk("normal", [], 2400, 39)
    assert scheduling.is_high_risk("normal", [], 3000, 36)
    assert not scheduling.is_high_risk("normal", [], 2500, 37)


def test_call_days():
    assert scheduling.call_days(False) == [1, 3, 4, 5, 7, 14, 21, 28, 42]
    assert scheduling.call_days(True) == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 21, 28, 42]


def test_milestone_calls_only_future_and_at_10_ist():
    calls = scheduling.milestone_calls(date(2026, 11, 8), False, NOW)
    assert [c.day for c in calls] == [5, 7, 14, 21, 28, 42]  # day 5 = 13 Nov 10:00 IST is still ahead
    assert calls[0].due_at == datetime(2026, 11, 13, 4, 30, tzinfo=UTC)


def test_missed_call_chain():
    first = scheduling.after_missed(0, True, NOW)
    assert first.next_call and first.next_call.due_at == NOW + timedelta(minutes=30) and not first.final_miss
    second = scheduling.after_missed(1, True, NOW)
    assert second.next_call and second.next_call.target == "family"
    third = scheduling.after_missed(2, True, NOW)
    assert third.next_call is None and third.final_miss


def test_quiet_hours_ist():
    assert is_quiet_hours(datetime(2026, 11, 13, 16, 0, tzinfo=UTC))  # 21:30 IST
    assert not is_quiet_hours(datetime(2026, 11, 13, 2, 0, tzinfo=UTC))  # 07:30 IST
    nxt = next_allowed_time(datetime(2026, 11, 13, 16, 0, tzinfo=UTC))
    assert nxt == datetime(2026, 11, 14, 1, 30, tzinfo=UTC)  # 07:00 IST next day


def test_routine_deferred_but_recheck_not():
    late = datetime(2026, 11, 13, 17, 0, tzinfo=UTC)  # 22:30 IST
    assert scheduling.effective_due(late, True, late) == datetime(2026, 11, 14, 1, 30, tzinfo=UTC)
    assert scheduling.effective_due(late, False, late) == late


# --------------------------------------------------------------------- access
MOTHERS = [
    access.MotherContacts("m_001", "+919800000001", ("+919800000002",), "a_001"),
    access.MotherContacts("m_002", "+919800000003", (), "a_002"),
]
ASHAS = {"+919800000009": "a_001"}


def test_resolve_roles():
    assert access.resolve_caller("+919800000001", MOTHERS, ASHAS).role == "mother"
    assert access.resolve_caller("+919800000002", MOTHERS, ASHAS).mother_ids == ("m_001",)
    asha = access.resolve_caller("+919800000009", MOTHERS, ASHAS)
    assert asha.role == "asha" and asha.mother_ids == ("m_001",)
    assert access.resolve_caller("+910000000000", MOTHERS, ASHAS).role == "unknown"


def test_read_permissions():
    asha = access.resolve_caller("+919800000009", MOTHERS, ASHAS)
    assert access.can_read_mother(asha, "m_001") and not access.can_read_mother(asha, "m_002")
    assert access.read_permission("family") == access.READ_STATUS
    assert not access.can_read_mother(access.CallerIdentity("unknown"), "m_001")


def test_sources_and_doctor():
    assert access.source_for("mother", "Rao") == "doctor_verified"
    assert access.source_for("mother", None) == "mother_reported"
    assert access.source_for("asha", None) == "asha_measured"
    assert access.source_for("unknown", None) == "family_reported"
    assert access.detect_doctor("This is Doctor Rao. Started iron.") == (True, "Rao")
    assert access.detect_doctor("the doctor said rest") == (True, None)


# ----------------------------------------------------------------- facilities
F = [
    facilities.FacilityInfo(
        "f1",
        "Private Near",
        "private",
        frozenset({"c_section", "blood_bank", "newborn_care", "postnatal_care"}),
        12.97,
        77.59,
        "high",
        True,
    ),
    facilities.FacilityInfo(
        "f2",
        "Govt Far",
        "government",
        frozenset({"c_section", "blood_bank", "newborn_care"}),
        13.10,
        77.59,
        "free",
        True,
    ),
    facilities.FacilityInfo("f3", "PHC Near", "government", frozenset({"postnatal_care"}), 12.98, 77.59, "free", False),
]


def test_emergency_ignores_cost_and_private():
    ranked = facilities.rank(F, "emergency", 12.97, 77.59)
    assert [f.id for f, _ in ranked] == ["f2"]


def test_routine_services_then_distance_then_cost():
    ranked = facilities.rank(F, "routine_checkup", 12.97, 77.59)
    assert ranked[0][0].id == "f1" and ranked[1][0].id == "f3"

"""Contract tests: every /api endpoint returns the documented shape (validated by schemas)."""

from __future__ import annotations

import pytest
from sqlmodel import select

from app.db.models import Entry
from app.schemas.api import (
    AshaListItem,
    AuditOut,
    MotherDetail,
    MotherOut,
    StatsOut,
    TicketOut,
    VitalsOut,
)
from tests.conftest import AUTH


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}


def test_reset_seeds_expected_counts(client):
    mothers = client.get("/api/mothers").json()
    assert len(mothers) == 3
    assert len(client.get("/api/ashas").json()) == 2
    lakshmi = next(m for m in mothers if m["id"] == "m_001")
    assert lakshmi["status"] == "green" and lakshmi["name"] == "Lakshmi"
    for m in mothers:
        MotherOut.model_validate(m)
    from app.db.models import Facility
    from app.db.session import new_session

    with new_session() as s:
        assert len(list(s.exec(select(Facility)))) == 30


def test_mother_detail_and_filters(client):
    MotherDetail.model_validate(client.get("/api/mothers/m_001").json())
    assert [m["id"] for m in client.get("/api/mothers?status=amber").json()] == ["m_002"]
    assert [m["id"] for m in client.get("/api/mothers?q=pri").json()] == ["m_003"]
    assert {m["id"] for m in client.get("/api/mothers?asha_id=a_001").json()} == {"m_001", "m_002"}
    assert client.get("/api/mothers/nope").status_code == 404


def test_timeline_audit_vitals_summary_calls(client):
    tl = client.get("/api/mothers/m_003/timeline").json()
    assert tl and tl[0]["created_at"] >= tl[-1]["created_at"]
    AuditOut.model_validate(client.get("/api/mothers/m_003/audit").json())
    v = VitalsOut.model_validate(client.get("/api/mothers/m_003/vitals").json())
    assert v.bp[0].systolic == 118 and v.baby_weight[0].grams == 3250
    assert "Priya" in client.get("/api/mothers/m_003/summary").json()["summary_text"]
    assert client.get("/api/mothers/m_003/calls").json() == []


def test_tickets_and_asha_list(client):
    open_t = client.get("/api/tickets?state=open").json()
    assert len(open_t) == 1
    TicketOut.model_validate(open_t[0])
    lst = client.get("/api/asha/a_001/list").json()
    for item in lst:
        AshaListItem.model_validate(item)
    assert lst[0]["mother"]["id"] == "m_002" and lst[0]["priority"] == 1


def test_stats_and_status_by_day(client):
    st = StatsOut.model_validate(client.get("/api/stats").json())
    assert st.mothers_enrolled == 3 and st.open_alerts == {"red": 0, "amber": 1} and st.asha_tasks_open == 1
    rows = client.get("/api/stats/status-by-day").json()
    assert len(rows) == 43 and rows[9]["amber"] == 1 and rows[1]["green"] == 1


def test_chain_tamper_detected(client):
    assert client.get("/api/mothers/m_003/audit").json()["valid"] is True
    from app.db.session import new_session

    with new_session() as s:
        e = s.exec(select(Entry).where(Entry.mother_id == "m_003")).first()
        e.value = "tampered"
        s.commit()
        tampered_id = e.id
    out = client.get("/api/mothers/m_003/audit").json()
    assert out["valid"] is False and out["broken_entry_id"] == tampered_id and out["broken_at"] == 1


def test_tools_require_bearer(client):
    body = {"phone": "+919800000001", "interaction_id": "x", "direction": "inbound"}
    assert client.post("/hooks/on-start", json=body).status_code == 401
    assert client.post("/hooks/on-start", json=body, headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert client.post("/hooks/on-start", json=body, headers=AUTH).status_code == 200
    assert client.post("/tools/assess-risk", json={"interaction_id": "x"}).status_code == 401


def test_place_call_and_recent(client):
    out = client.post("/api/calls", json={"mother_id": "m_001", "purpose": "onboarding"}).json()
    assert out["interaction_id"]
    recent = client.get("/api/calls/recent").json()
    assert recent[0]["interaction_id"] == out["interaction_id"] and recent[0]["purpose"] == "onboarding"
    calls = client.get("/api/mothers/m_001/calls").json()
    assert "outcome" not in calls[0] and "duration_seconds" not in calls[0]  # frontend defaults apply


def test_unenrolled_stub_hidden_from_list(client):
    client.post("/api/onboarding/photo", files={"file": ("s.jpg", b"x", "image/jpeg")}, data={"phone": "+919811111111"})
    assert all(m["phone"] != "+919811111111" for m in client.get("/api/mothers").json())


def test_missing_interaction_id_is_tolerated(client):
    r = client.post(
        "/hooks/on-start", headers=AUTH, json={"phone": "+919800000001", "interaction_id": None, "direction": "inbound"}
    )
    assert r.status_code == 200 and r.json()["mother_name"] == "Lakshmi"
    r = client.post(
        "/tools/assess-risk", headers=AUTH, json={"phone": "+919800000001", "transcript": "User: ella chennagide"}
    )
    assert r.status_code == 200 and r.json()["level"] == "green"


def test_null_caller_phone_is_an_unknown_caller(client):
    """Sarvam dashboard 'Send' tests pass User identifier = null."""
    r = client.post("/tools/read-summary", headers=AUTH, json={"caller_phone": None, "interaction_id": None})
    assert r.status_code == 200 and r.json()["allowed"] is False
    r = client.post("/tools/record-update", headers=AUTH, json={"caller_phone": None, "transcript": "User: BP 120/80"})
    assert r.status_code == 200
    r = client.post("/tools/find-facility", headers=AUTH, json={"mother_phone": None, "need": "emergency_obstetric"})
    assert r.status_code == 200 and r.json()["say_text"]
    before = client.get("/api/mothers").json()
    r = client.post("/tools/onboarding-save", headers=AUTH, json={"phone": None, "transcript": "User: naanu Asha"})
    assert r.status_code == 200 and r.json()["pending_id"] is None
    assert len(client.get("/api/mothers").json()) == len(before)  # no phoneless mother created


@pytest.mark.parametrize("raw", ["917019142715", "07019142715", "7019142715", "+91 70191-42715"])
def test_caller_phone_formats_are_normalised(raw):
    from app.schemas.api import AssessRiskIn

    assert AssessRiskIn(phone=raw, interaction_id="i").phone == "+917019142715"
    assert AssessRiskIn(phone="c150c4d0b39d", interaction_id="i").phone == "c150c4d0b39d"  # browser-test id


def test_mother_facilities_ranked_with_reasons(client):
    r = client.get("/api/mothers/m_001/facilities").json()
    assert r["need"] == "routine_checkup" and r["options"]
    client.post(
        "/api/demo/inject", json={"mother_id": "m_001", "transcript": "User: ondu ghante alli batte poora odde aaytu"}
    )
    r = client.get("/api/mothers/m_001/facilities").json()
    assert r["need"] == "emergency_mother"
    top = r["options"][0]
    assert top["name"] == "Bengaluru District Hospital (demo)" and top["open_24x7"]
    assert top["reasons"][0].startswith("Can treat:") and any("demo data" in x for x in top["reasons"])
    assert all(o["availability"] != "full" for o in r["options"][:1])

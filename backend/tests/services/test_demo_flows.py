"""End-to-end behaviour through the HTTP API with mocked Sarvam (SARVAM_MOCK=true)."""

from __future__ import annotations

import pytest

from app.integrations.registry import get_integrations
from app.integrations.sarvam_llm import ExtractionError
from app.services.assessment_service import script_book
from tests.conftest import AUTH

LAKSHMI, RAVI, SUNITA = "+919800000001", "+919800000002", "+919800000009"


def assess(client, transcript, iid="int_1", phone=LAKSHMI, **extra):
    r = client.post("/tools/assess-risk", headers=AUTH,
                    json={"phone": phone, "interaction_id": iid, "transcript": transcript, **extra})  # fmt: skip
    assert r.status_code == 200, r.text
    return r.json()


def start(client, iid, phone=LAKSHMI, direction="inbound"):
    r = client.post(
        "/hooks/on-start", headers=AUTH, json={"phone": phone, "interaction_id": iid, "direction": direction}
    )
    assert r.status_code == 200, r.text
    return r.json()


def end(client, iid, transcript, phone=LAKSHMI, answered=True):
    r = client.post("/hooks/on-end", headers=AUTH, json={"phone": phone, "interaction_id": iid, "transcript": transcript,
                                                         "duration_seconds": "02:22", "variables": {}, "answered": answered})  # fmt: skip
    assert r.status_code == 200, r.text
    return r.json()


def onboard_lakshmi(client):
    job = client.post("/api/onboarding/photo", files={"file": ("slip.jpg", b"fake-image", "image/jpeg")},
                      data={"phone": LAKSHMI}).json()  # fmt: skip
    assert job["status"] == "done" and job["mother_id"] == "m_001"
    assert job["fields"]["delivery_type"] == "c_section" and job["fields"]["baby_birth_weight_grams"] == 2600
    saved = client.post(
        "/tools/onboarding-save",
        headers=AUTH,
        json={
            "phone": LAKSHMI,
            "interaction_id": "int_onb",
            "transcript": "User: haudu, Kannada. My husband Ravi, 9800000002",
        },
    ).json()
    assert "C-section" in saved["readback_text"] and "Do you agree" in saved["readback_text"]
    ok = client.post(
        "/tools/confirm-update", headers=AUTH, json={"pending_id": saved["pending_id"], "confirmed": True}
    ).json()
    assert ok["saved"] and ok["entry_ids"]
    return ok


# ------------------------------------------------------------------ onboarding
def test_onboarding_photo_readback_confirm(client):
    onboard_lakshmi(client)
    m = client.get("/api/mothers/m_001").json()
    assert m["mother"]["delivery_type"] == "c_section" and m["mother"]["consent_at"]
    assert m["mother"]["risk_profile"] == "high" and m["baby"]["birth_weight_grams"] == 2600
    sources = {e["source"] for e in client.get("/api/mothers/m_001/timeline").json()}
    assert "document_extracted" in sources
    assert client.get("/api/mothers/m_001/audit").json()["valid"]
    # repeat confirm is idempotent
    assert len(client.get("/api/mothers?q=Lakshmi").json()) == 1


def test_on_start_contexts(client):
    ctx = start(client, "int_a")  # she calls in (maybe an emergency): no onboarding intro
    assert ctx["caller_role"] == "mother" and ctx["call_purpose"] == "inbound" and ctx["mother_name"] == "Lakshmi"
    ctx = start(client, "int_a2", direction="outbound")  # Jodi's own first call to her: onboarding
    assert ctx["call_purpose"] == "onboarding"
    onboard_lakshmi(client)
    ctx = start(client, "int_b")
    assert ctx["call_purpose"] == "inbound" and ctx["open_ticket"] == "none" and "stitches" in ctx["focus_topics"]
    asha = start(client, "int_c", SUNITA)
    assert asha["caller_role"] == "asha" and asha["asha_patient_list"].startswith("1. Kavya")
    unknown = start(client, "int_d", "+919999999999")
    assert unknown["caller_role"] == "unknown" and unknown["mother_name"] == ""


def test_outbound_call_binds_to_real_interaction_id(client):
    placed = client.post("/api/calls", json={"mother_id": "m_001", "purpose": "checkin"}).json()
    ctx = start(client, "int_real_1", LAKSHMI, "outbound")
    assert ctx["call_purpose"] == "checkin"
    calls = client.get("/api/calls/recent").json()
    assert calls[0]["interaction_id"] == "int_real_1" and placed["interaction_id"] != "int_real_1"


# --------------------------------------------------------------- check-in flow
DEMO_CHECKIN = "Agent: Hegiddira?\nUser: naalku batte since morning, tale bhaara. magu haalu kammi kudiyuttide."


def test_demo_checkin_is_amber_with_fixed_scripts(client):
    onboard_lakshmi(client)
    r = assess(client, DEMO_CHECKIN, "int_chk")
    assert r["level"] == "amber" and r["transfer_to"] is None
    assert {"M-BLEED-02", "M-HTN-05", "B-FEED-02"} <= set(r["rule_ids"])
    amber_m, used = script_book().render("AMBER-MOTHER", "kn", "Lakshmi")  # Lakshmi's call language is Kannada
    assert used == "kn"
    assert r["say_verbatim"].startswith(amber_m) and script_book().get("AMBER-BABY", "kn")[0] in r["say_verbatim"]
    codes = {e["code"] for e in client.get("/api/mothers/m_001/timeline").json()}
    assert {"pads_soaked_count", "headache_severe", "feeding_poor"} <= codes  # facts appear live
    assert client.get("/api/mothers/m_001").json()["mother"]["status"] == "amber"


def test_red_bleed_reads_fixed_script_and_transfers(client):
    r = assess(client, "User: ondu ghante alli batte poora odde aaytu")
    assert r["level"] == "red" and r["rule_ids"] == ["M-BLEED-01"]
    expected, _ = script_book().render("RED-BLEED", "kn", "Lakshmi", "Vani Vilas Women and Children Hospital")
    assert r["say_verbatim"] == expected
    assert r["transfer_to"] == RAVI and r["ticket_id"]
    t = client.get("/api/tickets?state=open").json()
    lak = next(x for x in t if x["mother_id"] == "m_001")
    assert lak["state"] == "notified" and "asha:a_001" in lak["assigned_to"]


def test_red_bleed_call_mode_phones_the_family_instead_of_transfer(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "family_contact", "call")
    placed = get_integrations().call_placer.placed
    n = len(placed)
    r = assess(client, "User: ondu ghante alli batte poora odde aaytu")
    assert r["level"] == "red" and r["transfer_to"] is None  # Jodi stays with the mother
    assert any(p[0] == RAVI and p[1] == "family_alert" for p in placed[n:])  # Jodi phones the husband
    lak = next(x for x in client.get("/api/tickets?state=open").json() if x["mother_id"] == "m_001")
    assert any("family alert call placed" in h["note"] for h in lak["history"])


def test_safety_net_fires_even_if_llm_fails(client, monkeypatch):
    async def boom(*_a, **_k):
        raise ExtractionError("down")

    monkeypatch.setattr(get_integrations().extractor, "extract", boom)
    r = assess(client, "User: avalige jhatke bantu")
    assert r["level"] == "red" and "K-SAFETY-01" in r["rule_ids"]
    assert r["say_verbatim"] == script_book().get("RED-FITS", "kn")[0]
    green = assess(client, "User: ella chennagide", iid="int_2")
    assert green["level"] == "green" and green["clarify_question"] == "Could you tell me that again?"


def test_baby_fits_uses_baby_script(client):
    r = assess(client, "User: magu ge fits bantu")
    assert r["level"] == "red" and r["say_verbatim"].startswith("Lay the baby on its side")


def test_low_confidence_asks_again_and_does_not_save(client):
    r = assess(client, "User: magu isn't drinking milk")
    assert r["level"] == "green" and r["clarify_question"].startswith("Is the baby drinking no milk at all")
    assert "not_feeding" not in {e["code"] for e in client.get("/api/mothers/m_001/timeline").json()}
    r2 = assess(client, "User: magu isn't drinking milk.\nUser: no milk at all")
    assert r2["level"] == "red" and "B-FEED-01" in r2["rule_ids"]


def test_dismissal_never_closes_or_lowers(client):
    assess(client, "User: ondu ghante alli batte poora odde aaytu", iid="int_r")
    r = assess(
        client, "User: ondu ghante alli batte poora odde aaytu\nUser: delivery aadmele heege, normal", iid="int_r"
    )
    assert r["level"] == "red"
    assert r["say_verbatim"] == script_book().get("DISMISSAL-RESPONSE", "kn")[0]
    t = next(x for x in client.get("/api/tickets?state=open").json() if x["mother_id"] == "m_001")
    assert t["dismissed_by_family"] and t["state"] == "notified"


def test_on_end_idempotent_and_saves_summary(client):
    start(client, "int_e")
    end(client, "int_e", DEMO_CHECKIN)
    n1 = len(client.get("/api/mothers/m_001/timeline").json())
    end(client, "int_e", DEMO_CHECKIN)
    assert len(client.get("/api/mothers/m_001/timeline").json()) == n1
    detail = client.get("/api/calls/int_e").json()
    assert detail["call"]["duration_seconds"] == 142 and detail["call"]["outcome"] == "amber_flag"
    assert "4 pads soaked since morning" in detail["call"]["summary"] and detail["rule_ids"]


def test_inject_runs_on_end_pipeline_and_is_idempotent(client):
    body = {
        "mother_id": "m_001",
        "transcript": "User: ondu ghante alli batte poora odde aaytu",
        "interaction_id": "demo_1",
    }
    assert client.post("/api/demo/inject", json=body).json() == {"ok": True, "level": "red"}
    n = len(client.get("/api/mothers/m_001/timeline").json())
    assert client.post("/api/demo/inject", json=body).json()["level"] == "red"
    assert len(client.get("/api/mothers/m_001/timeline").json()) == n
    t = next(x for x in client.get("/api/tickets?state=open").json() if x["mother_id"] == "m_001")
    assert RAVI in t["assigned_to"]  # not live → family alert call placed


# -------------------------------------------------------------- ASHA + doctor
def test_asha_update_readback_saves_measured_and_marks_reached(client, clock):
    assess(client, "User: ondu ghante alli batte poora odde aaytu", iid="int_red")
    p = client.post(
        "/tools/record-update",
        headers=AUTH,
        json={
            "caller_phone": SUNITA,
            "interaction_id": "int_asha",
            "transcript": "User: Lakshmi nodide, BP 150 over 100, magu 2.8 kg",
        },
    ).json()
    assert p["readback_text"] == "I heard: Lakshmi, BP 150 over 100, baby weight 2.8 kilograms. Shall I save this?"
    clock.advance(minutes=5)
    ok = client.post(
        "/tools/confirm-update", headers=AUTH, json={"pending_id": p["pending_id"], "confirmed": True}
    ).json()
    assert ok == {"saved": True, "entry_ids": ok["entry_ids"], "say": "Saved. Thank you."} and len(ok["entry_ids"]) == 4
    tl = client.get("/api/mothers/m_001/timeline").json()
    assert {e["source"] for e in tl if e["interaction_id"] == "int_asha"} == {"asha_measured"}
    t = next(x for x in client.get("/api/tickets").json() if x["mother_id"] == "m_001")
    assert t["state"] == "reached"
    # later non-red follow-up closes it
    clock.advance(hours=2)
    assess(client, "User: ella chennagide, jvara illa", iid="int_follow")
    t = next(x for x in client.get("/api/tickets").json() if x["mother_id"] == "m_001")
    assert t["state"] == "closed"


def test_doctor_on_mothers_phone(client):
    onboard_lakshmi(client)
    s = client.post(
        "/tools/read-summary", headers=AUTH, json={"caller_phone": LAKSHMI, "interaction_id": "int_doc"}
    ).json()
    assert s["allowed"] and "Lakshmi, day 1 after C-section" in s["summary_text"] and "Labetalol" in s["summary_text"]
    p = client.post(
        "/tools/record-update",
        headers=AUTH,
        json={
            "caller_phone": LAKSHMI,
            "interaction_id": "int_doc",
            "transcript": "User: This is Doctor Rao. Started iron and labetalol 200.",
        },
    ).json()
    assert p["readback_text"].startswith("I heard: Doctor Rao, for Lakshmi") and "Labetalol 200" in p["readback_text"]
    client.post("/tools/confirm-update", headers=AUTH, json={"pending_id": p["pending_id"], "confirmed": True})
    docs = [e for e in client.get("/api/mothers/m_001/timeline").json() if e["source"] == "doctor_verified"]
    assert {e["kind"] for e in docs} == {"medicine"} and len(docs) == 2
    assert client.get("/api/mothers/m_001/audit").json()["valid"]


def test_unknown_caller_cannot_read_but_can_add(client):
    s = client.post("/tools/read-summary", headers=AUTH, json={"caller_phone": "+919999999999"}).json()
    assert s == {"allowed": False, "summary_text": script_book().get("NOT-ALLOWED", "en")[0]}
    p = client.post(
        "/tools/record-update",
        headers=AUTH,
        json={"caller_phone": "+919999999999", "transcript": "User: Priya ge jvara ide"},
    ).json()
    client.post("/tools/confirm-update", headers=AUTH, json={"pending_id": p["pending_id"], "confirmed": True})
    e = client.get("/api/mothers/m_003/timeline").json()[0]
    assert (
        e["source"] == "family_reported"
        and e["flags"] == ["unverified_caller"]
        and e["source_phone"] == "+919999999999"
    )


def test_family_status_only_summary(client):
    s = client.post("/tools/read-summary", headers=AUTH, json={"caller_phone": RAVI}).json()
    assert s["allowed"] and s["summary_text"].startswith("Lakshmi, day 1. Current status: green")


def test_rejected_update_not_saved(client):
    p = client.post(
        "/tools/record-update", headers=AUTH, json={"caller_phone": SUNITA, "transcript": "User: Lakshmi BP 150/100"}
    ).json()
    r = client.post(
        "/tools/confirm-update", headers=AUTH, json={"pending_id": p["pending_id"], "confirmed": False}
    ).json()
    assert r["saved"] is False and r["entry_ids"] == []


# ------------------------------------------------------- family alert + escal.
def test_family_alert_call_reads_alert_and_yes_acknowledges(client):
    client.post(
        "/api/demo/inject", json={"mother_id": "m_001", "transcript": "User: ondu ghante alli batte poora odde aaytu"}
    )
    start(client, "int_fam", RAVI, "outbound")  # binds the family_alert call placed by the ticket
    r = assess(client, "Agent: Namaskara\nUser: haa, heli", iid="int_fam", phone=RAVI)
    assert r["level"] == "red" and r["say_verbatim"].startswith("ನಮಸ್ಕಾರ, ನಾನು ಜೋಡಿ, Lakshmi ಬಗ್ಗೆ")
    assert r["transfer_to"] is None
    r = assess(client, "User: haa, heli\nUser: delivery aadmele heege, normal", iid="int_fam", phone=RAVI)
    assert r["say_verbatim"] == script_book().get("DISMISSAL-RESPONSE", "kn")[0]
    assess(client, "User: haa, heli\nUser: delivery aadmele heege, normal\nUser: sari, yes", iid="int_fam", phone=RAVI)
    t = next(x for x in client.get("/api/tickets").json() if x["mother_id"] == "m_001")
    assert t["state"] == "acknowledged" and t["dismissed_by_family"]


def test_red_escalates_after_10_minutes_without_ack(client, clock):
    import asyncio

    from app.db.session import new_session
    from app.services import ticket_service

    assess(client, "User: ondu ghante alli batte poora odde aaytu")
    with new_session() as s:
        assert asyncio.run(ticket_service.escalation_tick(s, clock.advance(minutes=9))) == 0
        assert asyncio.run(ticket_service.escalation_tick(s, clock.advance(minutes=1, seconds=1))) == 1
    t = next(x for x in client.get("/api/tickets").json() if x["mother_id"] == "m_001")
    assert "+919800000006" in t["assigned_to"] and t["state"] == "notified"
    client.post(f"/api/tickets/{t['id']}/ack", json={"by": RAVI})
    with new_session() as s:
        asyncio.run(ticket_service.escalation_tick(s, clock.advance(minutes=30)))
    after = next(x for x in client.get("/api/tickets").json() if x["id"] == t["id"])
    assert after["state"] == "acknowledged" and after["assigned_to"] == t["assigned_to"]


def test_cannot_close_without_reached(client):
    r = assess(client, "User: ondu ghante alli batte poora odde aaytu")
    assess(client, "User: ella chennagide", iid="int_ok")
    t = next(x for x in client.get("/api/tickets").json() if x["id"] == r["ticket_id"])
    assert t["state"] == "notified"
    assert client.post(f"/api/tickets/{t['id']}/ack", json={"by": "x"}).status_code == 200
    assert client.post(f"/api/tickets/{t['id']}/ack", json={"by": "x"}).status_code == 409


def test_missed_calls_chain_to_h_missed(client, clock):
    """Each scheduled call = mother → retry +30 min → family; 2 fully missed → H-MISSED-01."""
    import asyncio

    from app.db.session import new_session
    from app.repositories import records as rrepo
    from app.services import call_service

    targets = []
    for _ in range(6):
        with new_session() as s:
            sc = rrepo.pending_scheduled(s, "m_003")[0]
            sc.due_at = clock.t
            s.commit()
            targets.append((sc.reason, sc.target_phone))
            asyncio.run(call_service.run_due_calls(s, clock.t))
        call = client.get("/api/calls/recent").json()[0]
        end(client, call["interaction_id"], "", phone="", answered=False)
        clock.advance(minutes=31)
    assert [r for r, _ in targets[:3]] == ["milestone", "missed_retry", "family_followup"]
    assert targets[2][1] == "+919800000007"
    m = client.get("/api/mothers/m_003").json()["mother"]
    assert m["status"] == "amber"
    t = next(x for x in client.get("/api/tickets?state=open").json() if x["mother_id"] == "m_003")
    assert t["rule_ids"] == ["H-MISSED-01"]
    assert client.get("/api/stats").json()["asha_tasks_open"] == 2


@pytest.mark.parametrize("need,expected_type", [("emergency", "government"), ("phototherapy", None)])
def test_find_facility(client, need, expected_type):
    r = client.post("/tools/find-facility", headers=AUTH, json={"mother_phone": LAKSHMI, "need": need}).json()
    assert r["facility_id"] and r["say_text"].endswith(".")
    if need == "emergency":
        assert "District Hospital" in r["say_text"] or "Hospital" in r["say_text"]


def test_timeline_entries_carry_the_rules_they_triggered(client):
    assess(client, "User: ondu ghante alli batte poora odde aaytu", "int_rules")
    tl = client.get("/api/mothers/m_001/timeline").json()
    mine = [e for e in tl if e["interaction_id"] == "int_rules"]
    assert any(e["rule_ids"] == ["M-BLEED-01"] for e in mine)
    assert all(e["rule_ids"] == [] for e in tl if e["interaction_id"] != "int_rules" or e["code"] is None)


def test_failing_family_call_never_delays_or_breaks_the_live_reply(client, monkeypatch):
    from app.core.config import get_settings
    from app.core.errors import IntegrationNotConfigured

    async def down(*_a, **_k):
        raise IntegrationNotConfigured("outbound call failed: 401")

    monkeypatch.setattr(get_settings(), "family_contact", "call")
    monkeypatch.setattr(get_integrations().call_placer, "place_call", down)
    r = assess(client, "User: ondu ghante alli batte poora odde aaytu", "int_down")
    assert r["level"] == "red" and r["say_verbatim"] and r["ticket_id"]  # Jodi still gets her script
    lak = next(x for x in client.get("/api/tickets?state=open").json() if x["mother_id"] == "m_001")
    assert any("family alert call failed" in h["note"] for h in lak["history"])  # logged after the reply


def test_amber_does_not_phone_the_family(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "family_contact", "call")
    placed = get_integrations().call_placer.placed
    n = len(placed)
    r = assess(client, "User: 4 pads soaked since morning", "int_amber")
    assert r["level"] == "amber"
    assert not any(p[1] == "family_alert" for p in placed[n:])


def test_hindi_speech_gets_hindi_script_even_if_language_variable_says_kannada(client):
    r = assess(client, "User: एक घंटे में पूरा पैड भीग गया, pad soaked within an hour", "int_hi", language="kn")
    assert r["level"] == "red"
    assert (
        r["say_verbatim"]
        == script_book().render("RED-BLEED", "hi", "Lakshmi", "Vani Vilas Women and Children Hospital")[0]
    )


def test_red_family_calls_once_per_call_and_again_until_acknowledged(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "family_contact", "call")
    placed = get_integrations().call_placer.placed
    n = len(placed)

    def family_calls():
        return sum(p[1] == "family_alert" for p in placed[n:])

    assess(client, "User: ondu ghante alli batte poora odde aaytu", "int_m")  # mother red → ticket + call
    assess(client, "User: maguvige usiru bega bartide", "int_m")  # 2nd sign, same call → no double ring
    assert family_calls() == 1
    lak = next(x for x in client.get("/api/tickets?state=open").json() if x["mother_id"] == "m_001")
    assert any("new danger sign" in h["note"] for h in lak["history"])  # ASHA/Telegram still re-alerted
    assess(client, "User: ondu ghante alli batte poora odde aaytu", "int_m2")  # new call, no time gap → rings
    assert family_calls() == 2
    assert client.post(f"/api/tickets/{lak['id']}/ack", json={"by": "family", "note": "on it"}).status_code == 200
    assess(client, "User: ondu ghante alli batte poora odde aaytu", "int_m3")  # family on it → no more calls
    assert family_calls() == 2


def test_mother_speaks_hindi_so_husbands_alert_call_is_hindi(client, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "family_contact", "call")
    placed = get_integrations().call_placer.placed
    n = len(placed)
    r = assess(client, "User: मुझे हिंदी आती है\nUser: एक घंटे में पूरा पैड भीग गया, pad soaked within an hour", "int_hm")
    assert r["level"] == "red" and r["say_verbatim"].startswith("सीधी लेट जाइए")  # mother hears Hindi
    fam = [p for p in placed[n:] if p[1] == "family_alert"]
    assert fam and fam[-1][2]["language"] == "hi"  # husband's call opens in Hindi
    assert client.get("/api/mothers/m_001").json()["mother"]["language"] == "hi"
    start(client, "int_hf", RAVI, "outbound")
    r = assess(client, "Agent: Namaste\nUser: haan, boliye", iid="int_hf", phone=RAVI)  # romanised reply
    assert r["say_verbatim"].startswith("नमस्कार, मैं जोडी बोल रही हूँ, Lakshmi")  # husband's script in Hindi


def test_next_call_knows_her_previous_symptoms(client, clock):
    assess(client, "User: thumba thale novu ide, kannu manju aagide", "int_sym1")  # severe headache, blurred vision
    assess(client, "User: jwara illa", "int_sym1")  # "no fever" is not a symptom to follow up
    clock.advance(days=1)
    ctx = client.post("/hooks/on-start", headers=AUTH, json={"phone": LAKSHMI, "interaction_id": "int_sym2"}).json()
    assert "blurred vision (yesterday)" in ctx["previous_symptoms"]
    assert "fever" not in ctx["previous_symptoms"]
    assert ctx["last_summary"].startswith("Recently reported symptoms: ")


def test_post_call_webhook_transcript_is_processed_after_an_empty_on_end(client):
    from tests.conftest import AUTH as _AUTH

    start(client, "int_late", direction="outbound")
    client.post("/hooks/on-end", headers=_AUTH, json={"phone": LAKSHMI, "interaction_id": "int_late", "transcript": ""})
    assert not [e for e in client.get("/api/mothers/m_001/timeline").json() if e["interaction_id"] == "int_late"]
    secret = "test-secret"
    payload = {"attempt_id": "a1", "interaction_id": "int_late", "status": "connected", "duration": 60,
               "interaction_transcript": [{"role": "agent", "en_text": "How many pads since morning?"},
                                          {"role": "user", "en_text": "4 pads soaked since morning"}],
               "metadata": {"token": secret}}  # fmt: skip
    assert client.post("/hooks/sarvam-webhook", json=payload).status_code == 200
    mine = [e for e in client.get("/api/mothers/m_001/timeline").json() if e["interaction_id"] == "int_late"]
    assert mine and any(e["level"] == "amber" for e in mine)  # the answer reached her record, coloured


def test_timeline_entries_have_levels(client):
    assess(client, "User: ondu ghante alli batte poora odde aaytu", "int_lv")
    tl = [e for e in client.get("/api/mothers/m_001/timeline").json() if e["interaction_id"] == "int_lv"]
    assert any(e["level"] == "red" for e in tl)
    assess(client, "User: jvara illa", "int_lv2")
    tl2 = [e for e in client.get("/api/mothers/m_001/timeline").json() if e["interaction_id"] == "int_lv2"]
    assert tl2 and all(e["level"] == "green" for e in tl2 if e["kind"] in ("symptom", "vital"))


def test_guard_drops_agent_quotes_and_unstated_stopping():
    from app.services.assessment_service import _guard_facts

    t = "Agent: the baby's weight was 2.6 kilograms.\nUser: Today afternoon a little bit, I will take it at night."
    facts = [
        {"subject": "baby", "code": "weight_grams", "present": True, "quote": "the baby's weight was 2.6 kilograms"},
        {"subject": "mother", "code": "stopped_bp_medicine", "present": True,
         "quote": "Today afternoon a little bit, I will take it at night"},
    ]  # fmt: skip
    assert _guard_facts(facts, t) == []


def test_later_green_check_in_same_call_keeps_earlier_amber(client):
    assess(client, "Agent: Any headache or blurred vision?\nUser: kannu manju aagide", "int_blocks")  # amber
    assess(client, "Agent: Is the baby feeding well?\nUser: chennagi kudiyuttide", "int_blocks")  # green block
    tl = [e for e in client.get("/api/mothers/m_001/timeline").json() if e["interaction_id"] == "int_blocks"]
    vision = [e for e in tl if e["code"] == "vision_blurred"]
    assert vision and vision[0]["level"] == "amber"


def test_call_log_has_readable_turns(client):
    start(client, "int_log", direction="outbound")
    payload = {"attempt_id": "a2", "interaction_id": "int_log", "status": "connected", "duration": 30,
               "interaction_transcript": [
                   {"role": "agent", "en_text": "Any fever?", "indic_text": "ಜ್ವರ ಇದೆಯಾ?"},
                   {"role": "user", "en_text": "No fever.", "indic_text": "ಜ್ವರ ಇಲ್ಲ."}],
               "metadata": {"token": "test-secret"}}  # fmt: skip
    client.post("/hooks/sarvam-webhook", json=payload)
    d = client.get("/api/calls/int_log").json()
    assert [t["speaker"] for t in d["turns"]] == ["Jodi", "Lakshmi"]
    assert d["turns"][1] == {"role": "caller", "speaker": "Lakshmi", "text": "ಜ್ವರ ಇಲ್ಲ.", "en": "No fever."}
    assert d["transcript"].startswith("Jodi: Any fever?")


def test_call_detail_works_for_sarvam_ids_with_a_slash(client):
    start(client, "20261114/abc-01:02:03-xyz", direction="outbound")
    assert client.get("/api/calls/20261114%2Fabc-01%3A02%3A03-xyz").status_code == 200
    assert client.get("/api/calls/recent").status_code == 200


def test_call_conversation_is_written_to_a_backend_log_file(client, tmp_path, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "call_logs_enabled", True)
    monkeypatch.setattr(get_settings(), "call_logs_dir", tmp_path)
    start(client, "20261114/log-01", direction="outbound")
    payload = {"attempt_id": "a3", "interaction_id": "20261114/log-01", "status": "connected", "duration": 40,
               "interaction_transcript": [
                   {"role": "agent", "en_text": "Any fever?", "indic_text": "ಜ್ವರ ಇದೆಯಾ?"},
                   {"role": "user", "en_text": "4 pads soaked since morning", "indic_text": "naalku batte"}],
               "metadata": {"token": "test-secret"}}  # fmt: skip
    client.post("/hooks/sarvam-webhook", json=payload)
    files = list(tmp_path.rglob("*.txt"))
    assert len(files) == 1
    text = files[0].read_text(encoding="utf-8")
    assert "Jodi: ಜ್ವರ ಇದೆಯಾ?" in text and "(Any fever?)" in text
    assert "Lakshmi: naalku batte" in text and "Level: AMBER" in text
    assert "--- Recorded in her health record ---" in text and "+919800000001" not in text  # phone masked



def test_share_tokens_are_letters_and_digits_only():
    from app.services.share_service import _new_token

    toks = {_new_token() for _ in range(200)}
    assert len(toks) == 200 and all(t.isalnum() and t.isascii() and len(t) == 40 for t in toks)

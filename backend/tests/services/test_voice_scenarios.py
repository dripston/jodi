"""The voice/tests scenarios, run against the backend with the offline (lexicon) extractor.

Sample lines are the voice agent's drafts from voice/tests/*.md. Expected levels follow
docs/clinical-rules.md (where the brief differs, voice/tests notes the discrepancy).
"""

from __future__ import annotations

import pytest

from app.services.assessment_service import script_book
from tests.conftest import AUTH

LAKSHMI, SUNITA = "+919800000001", "+919800000009"


def assess(client, lines, iid, phone=LAKSHMI, **extra):
    transcript = "\n".join(f"User: {line}" for line in lines)
    r = client.post("/tools/assess-risk", headers=AUTH,
                    json={"phone": phone, "interaction_id": iid, "transcript": transcript, **extra})  # fmt: skip
    assert r.status_code == 200
    return r.json()


def advance_to(client, day):
    client.post("/api/demo/advance-day", json={"mother_id": "m_001", "days": day - 1})


def test_03_dyad_fever_and_baby_feeding_less(client):
    first = ["Nange jvara ide, nenne raatriyinda maiyalli bisi.", "Magu haalu kudiyuttilla…"]
    r = assess(client, first, "s03")
    assert r["level"] == "amber" and "M-FEVER-01" in r["rule_ids"]
    assert r["clarify_question"] == "Is the baby drinking no milk at all, or drinking less than usual?"
    r = assess(client, [*first, "Kammi kudiyuttide. Beligginda mooru sala maatra."], "s03")
    assert r["level"] == "red" and {"M-FEVER-01", "B-FEED-02", "D-INF-01"} <= set(r["rule_ids"])
    assert r["transfer_to"] == "+919800000002"


def test_04_yellow_palms_day4(client):
    advance_to(client, 4)
    r = assess(client, ["Magu mukha swalpa haladi aagide."], "s04")
    assert r["level"] == "amber" and r["rule_ids"] == ["B-JAUN-03"]
    r = assess(
        client, ["Magu mukha swalpa haladi aagide.", "Haudu, kai kaalu haladi ide, angai, angaala eradu."], "s04"
    )
    assert r["level"] == "red" and "B-JAUN-01" in r["rule_ids"]
    assert r["say_verbatim"].startswith(script_book().get("RED-BABY", "kn")[0].split(".")[0])


def test_06_code_mixed_stitches(client):
    lines = ["Bleeding normal-aagi kammi aagide, two pads only.", "Stitches hatra… [noise] …",
             "Sorry, TV sound jaasti. Stitches hatra swalpa red aagide, swalpa neeru tara barta ide.",
             "Fever illa. Baby chennagi feed maadtide."]  # fmt: skip
    r = assess(client, lines, "s06")
    assert r["level"] == "amber" and r["rule_ids"] == ["M-WOUND-01"] and r["transfer_to"] is None


def test_07_hindi_switch(client):
    lines = ["Haudu, naanu Lakshmi… Hindi mein baat kar sakte hain?", "Dopahar se sar mein bahut dard hai.",
             "Aur aankhon ke aage andhera aur chamak aa rahi hai.", "Haath pair mein sujan nahi hai."]  # fmt: skip
    r = assess(client, lines, "s07", language="hi")
    assert r["level"] == "red" and "M-HTN-01" in r["rule_ids"] and r["transfer_to"] == "+919800000002"


def test_08_asha_bp_weight_then_reached(client):
    assess(client, ["ondu ghante alli batte poora odde aaytu"], "s08_red")
    p = client.post("/tools/record-update", headers=AUTH, json={"caller_phone": SUNITA, "interaction_id": "s08",
                    "transcript": "User: Namaskara, naanu Sunita, ASHA.\nUser: Lakshmi nodide, BP 150 over 100, magu 2.8 kg."}).json()  # fmt: skip
    assert p["readback_text"] == "I heard: Lakshmi, BP 150 over 100, baby weight 2.8 kilograms. Shall I save this?"
    client.post("/tools/confirm-update", headers=AUTH, json={"pending_id": p["pending_id"], "confirmed": True})
    t = next(x for x in client.get("/api/tickets").json() if x["mother_id"] == "m_001")
    assert t["state"] == "reached"


def test_09_doctor_on_mothers_phone_lowercase_asr(client):
    transcript = "\n".join(f"User: {x}" for x in [
        "Doctor nodbekante, phone kodtini.", "hello, i'm doctor meena. can you tell me her history?",
        "Started iron and labetalol 200.", "Labetalol 200 milligrams twice a day. Iron, one tablet once a day.",
    ])  # fmt: skip
    p = client.post("/tools/record-update", headers=AUTH,
                    json={"caller_phone": LAKSHMI, "interaction_id": "s09", "transcript": transcript}).json()  # fmt: skip
    assert p["readback_text"] == (
        "I heard: Doctor Meena, for Lakshmi, started Iron once a day, started Labetalol 200 mg twice a day. Shall I save this?"
    )
    client.post("/tools/confirm-update", headers=AUTH, json={"pending_id": p["pending_id"], "confirmed": True})
    docs = [e for e in client.get("/api/mothers/m_001/timeline").json() if e["source"] == "doctor_verified"]
    assert sorted(e["value"] for e in docs) == [
        "Iron once a day (Doctor Meena)",
        "Labetalol 200 mg twice a day (Doctor Meena)",
    ]


def test_10_unknown_neighbour_note_saved_not_shared(client):
    s = client.post("/tools/read-summary", headers=AUTH, json={"caller_phone": "+919777777777"}).json()
    assert s["allowed"] is False
    transcript = "\n".join(f"User: {x}" for x in [
        "Naanu Lakshmi avara pakkada mane. Lakshmi mattu magu hegiddare? Doctor enu helidru?",
        "Sari. Lakshmi tavarumanege hogiddare, pakkada ooru. Avara phone switch off.", "Haudu, sari.",
    ])  # fmt: skip
    p = client.post("/tools/record-update", headers=AUTH,
                    json={"caller_phone": "+919777777777", "transcript": transcript}).json()  # fmt: skip
    assert p["readback_text"].startswith("I heard: Sari. Lakshmi tavarumanege hogiddare")
    client.post("/tools/confirm-update", headers=AUTH, json={"pending_id": p["pending_id"], "confirmed": True})
    e = client.get("/api/mothers/m_001/timeline").json()[0]
    assert (e["kind"], e["source"], e["flags"]) == ("note", "family_reported", ["unverified_caller"])
    assert (
        client.get("/api/tickets?state=open").json()[0]["mother_id"] != "m_001"
    )  # a note never opens/reaches a ticket


def test_11_fits_in_passing_safety_net(client):
    r = assess(client, ["Lakshmi malagidaale, naanu avara atte.",
                        "Tale novu… haan, nenne raatri swalpa hottu fits bantu, aadre ega parvaagilla, enu chinte beda."], "s11")  # fmt: skip
    assert r["level"] == "red" and {"K-SAFETY-01", "M-FITS-01"} <= set(r["rule_ids"])
    assert r["say_verbatim"] == script_book().get("RED-FITS", "kn")[0]


def test_12_everyday_question_green(client):
    r = assess(client, ["Magu saayankaala tumba aLutte. Ishtu aLodu normal-a?",
                        "Haalu chennagi kudiyuttide, ombattu sala. Bisi illa, thanda illa."], "s12")  # fmt: skip
    assert r == {"level": "green", "rule_ids": [], "say_verbatim": None, "transfer_to": None,
                 "clarify_question": None, "ticket_id": r["ticket_id"]}  # fmt: skip


def test_14_onboarding_correction_last_value_wins(client):
    lines = ["Haudu, oppige ide.", "C-section, 12 November, magu 2.6 kg.", "Illa, 2.4 kg, 2.6 alla."]
    r = client.post("/tools/onboarding-save", headers=AUTH, json={"phone": LAKSHMI, "interaction_id": "s14",
                    "transcript": "\n".join(f"User: {x}" for x in lines)}).json()  # fmt: skip
    assert "baby 2.4 kilograms" in r["readback_text"] and "2.6" not in r["readback_text"].split("baby")[1].split(";")[0]


@pytest.mark.parametrize("lines", [
    ["Tale novu illa. Aadre beligge BP machine alli nooru aravattu, nooru antha banthu."],
    ["Tale novu illa. Aadre beligge BP machine alli nooru aravattu, nooru antha banthu.", "Haudu, nooru aravattu mele nooru."],
])  # fmt: skip
def test_15_ambiguous_kannada_bp(client, lines):
    r = assess(client, lines, "s15")
    assert r["level"] == "red" and "M-HTN-02" in r["rule_ids"]

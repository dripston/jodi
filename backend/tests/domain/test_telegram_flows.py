from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest

from app.domain import messages
from app.domain import telegram_inputs as ti
from app.domain.scripts import ScriptBook
from app.domain.telegram_flows import Event, step

TODAY = date(2026, 11, 13)


def text(t: str) -> Event:
    return Event("text", text=t, today=TODAY)


def cb(d: str) -> Event:
    return Event("callback", text=d, today=TODAY)


def run(events, state="new", data=None):
    data = data or {}
    res = None
    for ev in events:
        res = step(state, data, ev)
        state, data = res.state, res.data
    return res


# ---------------------------------------------------------------- inputs
@pytest.mark.parametrize(("raw", "out"), [("9800000001", "+919800000001"), ("+91 98000 00001", "+919800000001"),
                                          ("09800000001", "+919800000001"), ("919800000001", "+919800000001"),
                                          ("12345", None), ("5800000001", None)])  # fmt: skip
def test_parse_phone(raw, out):
    assert ti.parse_phone(raw) == out


@pytest.mark.parametrize(("raw", "grams"), [("2.6", 2600), ("2.6 kg", 2600), ("2600", 2600), ("2600 g", 2600),
                                            ("2,8 kg", 2800), ("0.5", None), ("6 kg", None), ("abc", None)])  # fmt: skip
def test_parse_weight(raw, grams):
    assert ti.parse_weight_grams(raw) == grams


@pytest.mark.parametrize(("raw", "out"), [("today", TODAY), ("yesterday", date(2026, 11, 12)),
                                          ("12/11/2026", date(2026, 11, 12)), ("2026-11-10", date(2026, 11, 10)),
                                          ("8 nov", date(2026, 11, 8)), ("3 days ago", date(2026, 11, 10)),
                                          ("14/11/2026", None), ("1/1/2026", None), ("31/02/2026", None)])  # fmt: skip
def test_parse_delivery_date(raw, out):
    assert ti.parse_delivery_date(raw, TODAY) == out


def test_parse_name():
    assert ti.parse_name("  lakshmi  ") == "Lakshmi"
    assert ti.parse_name("1234") is None and ti.parse_name("/start") is None and ti.parse_name("a") is None


# ---------------------------------------------------------------- linking
def test_start_asks_for_contact():
    r = step("new", {}, Event("command", text="/start", today=TODAY))
    assert r.state == "await_contact" and r.replies[0].request_contact


def test_contact_must_be_own():
    r = step("await_contact", {}, Event("contact", phone="919800000002", own_contact=False, today=TODAY))
    assert r.state == "await_contact" and "own number" in r.replies[0].text


def test_contact_lookup_match_links():
    r = step("await_contact", {}, Event("contact", phone="919800000002", first_name="Ravi", today=TODAY))
    assert r.state == "checking" and r.effects[0].kind == "lookup" and r.effects[0].payload["phone"] == "+919800000002"
    r2 = step(r.state, r.data, Event("lookup", result={"role": "family", "name": "Lakshmi"}, today=TODAY))
    assert r2.state == "linked" and "Lakshmi" in r2.replies[0].text


def test_contact_lookup_no_match_starts_onboarding():
    r = run([Event("contact", phone="919811111111", first_name="Ravi", today=TODAY),
             Event("lookup", result={}, today=TODAY)], state="await_contact")  # fmt: skip
    assert r.state == "ask_role"


# ---------------------------------------------------------------- onboarding
FAMILY_HAPPY = [cb("ob:role:family"), text("lakshmi"), text("98000 00001"), cb("ob:date:1"),
                cb("ob:type:c_section"), text("2.6 kg"), cb("ob:early:no"), cb("ob:dm:me"), cb("ob:lang:kn")]  # fmt: skip


def _family_start():
    return {"registrant_phone": "+919811111111", "registrant_name": "Ravi"}


def test_family_happy_path_every_state():
    states = []
    state, data = "ask_role", _family_start()
    for ev in FAMILY_HAPPY:
        r = step(state, data, ev)
        states.append(r.state)
        state, data = r.state, r.data
    assert states == ["mother_name", "mother_phone", "delivery_date", "delivery_type", "baby_weight",
                      "born_early", "dm_choice", "language", "upload_slip"]  # fmt: skip
    assert data["mother_phone"] == "+919800000001" and data["delivery_date"] == "2026-11-12"
    assert data["baby_weight"] == 2600 and data["dm_phone"] == "+919811111111" and data["language"] == "kn"
    r = step(state, data, cb("ob:skip"))
    assert r.state == "review" and "Lakshmi" in r.replies[0].text and r.replies[0].buttons
    r = step(r.state, r.data, cb("ob:review:ok"))
    assert r.state == "consent"
    r = step(r.state, r.data, cb("ob:consent:yes"))
    assert r.state == "saving" and r.effects[0].kind == "save_onboarding"


def test_mother_registrant_skips_phone_and_asks_dm():
    r = run([cb("ob:role:mother"), text("Lakshmi"), cb("ob:date:0"), cb("ob:type:normal"), text("3000"),
             cb("ob:early:unknown")], state="ask_role", data={"registrant_phone": "+919800000001"})  # fmt: skip
    assert r.state == "dm_name" and r.data["mother_phone"] == "+919800000001"
    r = run([text("Ravi"), cb("ob:rel:husband"), text("9800000002")], state=r.state, data=r.data)
    assert r.state == "language" and r.data["dm_relation"] == "husband" and r.data["dm_phone"] == "+919800000002"


def test_someone_else_as_decision_maker():
    r = run(FAMILY_HAPPY[:7] + [cb("ob:dm:other")], state="ask_role", data=_family_start())
    assert r.state == "dm_name"


@pytest.mark.parametrize(("state", "bad"), [("mother_name", "123"), ("mother_phone", "12"), ("delivery_date", "next week"),
                                            ("baby_weight", "9 kg"), ("dm_phone", "abc"), ("delivery_type", "maybe"),
                                            ("language", "french"), ("ask_role", "hello")])  # fmt: skip
def test_invalid_inputs_are_reasked(state, bad):
    r = step(state, {"role": "family"}, text(bad))
    assert r.state == state and r.replies


def test_unexpected_events_never_crash():
    for state in ("ask_role", "delivery_type", "upload_slip", "review", "consent", "reading_slip", "saving", "linked"):
        for ev in (Event("photo", file_id="f", today=TODAY), cb("garbage"), text(""), Event("contact", phone="1")):
            r = step(state, {"role": "family"}, ev)
            assert r.state and isinstance(r.replies, list)


def test_photo_on_slip_step_reads_then_reviews():
    r = step("upload_slip", {"role": "family"}, Event("photo", file_id="file1", today=TODAY))
    assert r.state == "reading_slip" and r.effects[0].payload["file_id"] == "file1"
    assert r.replies[0].text == "Reading your slip…"
    fields = {"medicines": [{"name": "Labetalol", "dose": "100 mg", "frequency": "twice daily"}]}
    r2 = step(r.state, r.data, Event("slip", result={"ok": True, "fields": fields}, today=TODAY))
    assert r2.state == "review" and "Labetalol" in r2.replies[-1].text


def test_edit_goes_back_to_review():
    data = run(FAMILY_HAPPY + [cb("ob:skip")], state="ask_role", data=_family_start()).data
    r = run([cb("ob:review:edit"), cb("ob:edit:baby_weight"), text("2.4 kg")], state="review", data=data)
    assert r.state == "review" and r.data["baby_weight"] == 2400 and "2.4 kg" in r.replies[-1].text
    r = run([cb("ob:review:edit"), cb("ob:edit:dm_name"), text("Savitri"), cb("ob:rel:mother_in_law"),
             text("9800000006")], state="review", data=r.data)  # fmt: skip
    assert r.state == "review" and r.data["dm_phone"] == "+919800000006"


def test_consent_not_now_returns_to_review():
    assert step("consent", {}, cb("ob:consent:no")).state == "review"


# ---------------------------------------------------------------- commands + prescription
def test_commands():
    assert step("ask_role", {}, Event("command", text="/status")).replies[0].text.startswith("Please send /start")
    assert step("linked", {}, Event("command", text="/status")).effects[0].kind == "status"
    stop = step("linked", {}, Event("command", text="/stop"))
    assert stop.state == "new" and stop.effects[0].kind == "stop"
    assert step("linked", {}, Event("command", text="/prescription")).state == "rx_wait"
    assert "/status" in step("linked", {}, Event("command", text="/help")).replies[0].text


def test_prescription_review_confirm_and_reject():
    r = step("linked", {}, Event("photo", file_id="rx1", today=TODAY))
    assert r.state == "rx_reading" and r.effects[0].kind == "read_rx"
    meds = [{"name": "Iron", "dose": "100 mg", "frequency": "once daily"}]
    r = step(r.state, r.data, Event("rx", result={"medicines": meds}, today=TODAY))
    assert r.state == "rx_review" and "Iron 100 mg" in r.replies[0].text
    ok = step(r.state, r.data, cb("rx:ok"))
    assert ok.state == "linked" and ok.effects[0].payload["medicines"] == meds
    no = step(r.state, r.data, cb("rx:no"))
    assert no.state == "linked" and not no.effects and "retake" in no.replies[0].text


# ---------------------------------------------------------------- messages
DOCS = Path(__file__).resolve().parents[3] / "docs"


def test_alert_instruction_sentences_are_verbatim_from_red_scripts():
    book = ScriptBook.load(DOCS / "red-scripts.md")
    red_mother = book.render("RED-MOTHER", "en", "Lakshmi", "District Hospital")[0]
    red_baby = book.render("RED-BABY", "en", None, "District Hospital")[0]
    text_m = messages.alert_text("red", ["mother"], "en", name="Lakshmi", day=5, what="x", facility="District Hospital")
    text_b = messages.alert_text("red", ["baby"], "en", name="Lakshmi", day=5, what="x", facility="District Hospital")
    assert "Please call 108 immediately and go to District Hospital. Do not wait." in red_mother
    assert "Please call 108 immediately and go to District Hospital. Do not wait." in text_m
    assert "Keep the baby warm and close to you." in red_baby and "Keep the baby warm and close to you." in text_b
    assert (
        "Her ASHA has been informed." in book.get("FAMILY-ALERT", "en")[0] and "Her ASHA has been informed." in text_m
    )


def test_kn_drafts_not_sent_until_approved():
    assert messages.render("STATUS_GREEN", "kn", name="L", day=1, next_call="x").startswith("🟢 Jodi check-in")


def test_ticket_buttons_and_reason():
    assert messages.ticket_buttons("t_1") == [
        [(messages.BUTTON_ACK, "ack:t_1")],
        [(messages.BUTTON_REACHED, "reached:t_1")],
    ]
    assert messages.plain_reason("Heavy bleeding; Family played down the sign (level kept)") == "Heavy bleeding"

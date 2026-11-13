"""Telegram channel end to end with the mock client (TELEGRAM_MOCK=true, webhook transport)."""

from __future__ import annotations

import asyncio
import itertools

import pytest
from sqlmodel import select

from app.core.config import get_settings
from app.db.models import Entry, FamilyContact, Mother, OutboundMessage, Ticket
from app.db.session import new_session
from app.integrations.registry import get_integrations
from tests.conftest import AUTH

TG = {"X-Telegram-Bot-Api-Secret-Token": "tg-secret"}
RAVI, RAVI_CHAT = "+919800000002", 7002
RED = "User: ondu ghante alli batte poora odde aaytu"
_ids = itertools.count(1000)


@pytest.fixture
def tg():
    client = get_integrations().telegram
    client.sent.clear()
    client.answered.clear()
    client.fail = False
    yield client
    client.fail = False


def _msg(chat, **body):
    return {"update_id": next(_ids), "message": {"chat": {"id": chat}, "from": {"id": chat}, **body}}


def text(chat, t):
    return _msg(chat, text=t)


def contact(chat, phone, own=True):
    return _msg(chat, contact={"phone_number": phone, "user_id": chat if own else 1, "first_name": "Ravi"})


def photo(chat, file_id="file_1"):
    return _msg(chat, photo=[{"file_id": "small"}, {"file_id": file_id}])


def callback(chat, data):
    n = next(_ids)
    return {"update_id": n, "callback_query": {"id": f"cb{n}", "data": data, "from": {"id": chat},
                                               "message": {"chat": {"id": chat}}}}  # fmt: skip


def send(client, *updates):
    for u in updates:
        assert client.post("/hooks/telegram", json=u, headers=TG).status_code == 200


def to_chat(tg, chat):
    return [m for m in tg.sent if m["chat_id"] == str(chat)]


def link_ravi(client, tg):
    send(client, text(RAVI_CHAT, "/start"), contact(RAVI_CHAT, "919800000002"))
    assert "Linked ✅" in to_chat(tg, RAVI_CHAT)[-1]["text"]


def lakshmi_ticket():
    with new_session() as s:
        return s.exec(select(Ticket).where(Ticket.mother_id == "m_001")).first()


# ---------------------------------------------------------------- transport
def test_webhook_secret_required(client, tg):
    assert client.post("/hooks/telegram", json=text(1, "/start")).status_code == 401
    assert (
        client.post(
            "/hooks/telegram", json=text(1, "/start"), headers={"X-Telegram-Bot-Api-Secret-Token": "x"}
        ).status_code
        == 401
    )
    assert tg.sent == []


def test_update_processed_once(client, tg):
    u = text(5, "/start")
    send(client, u, u)
    assert len(to_chat(tg, 5)) == 1 and to_chat(tg, 5)[0]["contact"]


# ---------------------------------------------------------------- linking / access
def test_linking_and_status(client, tg):
    link_ravi(client, tg)
    send(client, text(RAVI_CHAT, "/status"))
    status = to_chat(tg, RAVI_CHAT)[-1]["text"]
    assert status.startswith("Lakshmi, day 1 after delivery") and "Mother: 🟢" in status
    assert "+91" not in status and "9800000002" not in status  # no phone numbers in messages


def test_forwarded_contact_is_rejected(client, tg):
    send(client, text(8, "/start"), contact(8, "919800000002", own=False))
    assert "own number" in to_chat(tg, 8)[-2]["text"]


def test_unlinked_chat_gets_nothing(client, tg):
    send(client, text(9, "/status"))
    assert to_chat(tg, 9)[-1]["text"].startswith("Please send /start")
    client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED})
    t = lakshmi_ticket()
    send(client, callback(9, f"ack:{t.id}"))
    assert lakshmi_ticket().state == "notified"
    assert tg.answered[-1][1] == "This chat is not linked to Jodi."


def test_stop_deactivates(client, tg):
    link_ravi(client, tg)
    send(client, text(RAVI_CHAT, "/stop"))
    tg.sent.clear()
    client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED})
    assert to_chat(tg, RAVI_CHAT) == []


# ---------------------------------------------------------------- onboarding
def test_family_onboarding_end_to_end(client, tg):
    chat = 6001
    send(client, text(chat, "/start"), contact(chat, "919811111111"))
    assert "not registered" in to_chat(tg, chat)[-2]["text"]
    send(client, callback(chat, "ob:role:family"), text(chat, "divya"), text(chat, "98222 22222"),
         callback(chat, "ob:date:1"), callback(chat, "ob:type:c_section"), text(chat, "2.6 kg"),
         callback(chat, "ob:early:no"), callback(chat, "ob:dm:me"), callback(chat, "ob:lang:kn"), photo(chat))  # fmt: skip
    msgs = [m["text"] for m in to_chat(tg, chat)]
    assert "Reading your slip…" in msgs and "Labetalol" in msgs[-1] and msgs[-1].startswith("Please check")
    send(client, callback(chat, "ob:review:ok"), callback(chat, "ob:consent:yes"))
    welcome = to_chat(tg, chat)[-1]["text"]
    assert welcome.startswith("Welcome to Jodi") and "Divya and her baby are registered" in welcome
    assert "first call Divya on day 1 (13 Nov)" in welcome  # high risk → daily calls from day 1 (10:00 IST)
    with new_session() as s:
        m = s.exec(select(Mother).where(Mother.phone == "+919822222222")).one()
        assert (m.name, m.delivery_type, m.language, m.risk_profile) == ("Divya", "c_section", "kn", "high")
        assert m.consent_at is None and m.onboarded_at is not None  # her own spoken consent comes on the first call
        entries = list(s.exec(select(Entry).where(Entry.mother_id == m.id)))
        by_value = {e.value: e.source for e in entries}
        assert by_value["Birth weight 2.6 kg"] == "family_reported"
        assert any(v.startswith("Labetalol") and src == "document_extracted" for v, src in by_value.items())
        assert by_value["Consent recorded via Telegram by family"] == "system"
        fam = s.exec(select(FamilyContact).where(FamilyContact.mother_id == m.id)).one()
        assert fam.phone == "+919811111111" and fam.decision_maker
        assert s.exec(select(OutboundMessage).where(OutboundMessage.kind == "welcome")).first()
        mother_id = m.id
    assert client.get(f"/api/mothers/{mother_id}").json()["mother"]["day_since_delivery"] == 1
    assert client.get(f"/api/mothers/{mother_id}/audit").json()["valid"]
    ctx = client.post(
        "/hooks/on-start",
        headers=AUTH,
        json={"phone": "+919822222222", "interaction_id": "int_div", "direction": "outbound"},
    ).json()
    assert ctx["call_purpose"] == "onboarding"  # Jodi's first call to her still asks her own consent


def test_onboarding_skip_photo_and_born_early(client, tg):
    chat = 6002
    send(client, text(chat, "/start"), contact(chat, "919833333333"), callback(chat, "ob:role:mother"),
         text(chat, "Meera"), callback(chat, "ob:date:0"), callback(chat, "ob:type:normal"), text(chat, "3.1"),
         callback(chat, "ob:early:yes"), text(chat, "Kiran"), callback(chat, "ob:rel:husband"),
         text(chat, "9844444444"), callback(chat, "ob:lang:en"), callback(chat, "ob:skip"),
         callback(chat, "ob:review:ok"), callback(chat, "ob:consent:yes"))  # fmt: skip
    with new_session() as s:
        m = s.exec(select(Mother).where(Mother.phone == "+919833333333")).one()
        assert "preterm_birth" in m.complications and m.risk_profile == "high"
        assert (
            s.exec(select(Entry).where(Entry.mother_id == m.id, Entry.value == "Born early (before 37 weeks)"))
            .one()
            .source
            == "mother_reported"
        )


def test_invalid_answer_reasked_over_webhook(client, tg):
    chat = 6003
    send(client, text(chat, "/start"), contact(chat, "919855555555"), callback(chat, "ob:role:family"),
         text(chat, "divya"), text(chat, "12"))  # fmt: skip
    assert "10-digit" in to_chat(tg, chat)[-2]["text"]


# ---------------------------------------------------------------- alerts
def test_red_alert_call_first_then_telegram_with_buttons(client, tg):
    link_ravi(client, tg)
    placed = get_integrations().call_placer.placed
    n_calls = len(placed)
    assert client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED}).json()["level"] == "red"
    assert any(p[0] == RAVI and p[1] == "family_alert" for p in placed[n_calls:])  # voice stays primary
    alert = to_chat(tg, RAVI_CHAT)[-1]
    t = lakshmi_ticket()
    assert alert["text"].startswith("🔴 URGENT — Jodi alert for Lakshmi (day 1)")
    assert "Please call 108 immediately and go to" in alert["text"] and "pad soaked within an hour" in alert["text"]
    assert "+91" not in alert["text"] and "naalku" not in alert["text"]  # no phones, no transcript
    assert alert["buttons"] == [[("✅ I'm on it", f"ack:{t.id}")], [("🏥 We reached hospital", f"reached:{t.id}")]]
    assert "Vani Vilas Women and Children Hospital" in alert["text"]
    msgs = client.get("/api/mothers/m_001/messages").json()
    assert msgs[0]["kind"] == "alert" and msgs[0]["chat_role"] == "husband" and msgs[0]["delivered"]

    send(client, callback(RAVI_CHAT, f"ack:{t.id}"))
    tk = client.get("/api/tickets").json()
    lak = next(x for x in tk if x["id"] == t.id)
    assert lak["state"] == "acknowledged" and lak["history"][-1]["by"] == "telegram:+91 98•••• 0002"
    send(client, callback(RAVI_CHAT, f"reached:{t.id}"))
    lak = next(x for x in client.get("/api/tickets").json() if x["id"] == t.id)
    assert lak["state"] == "reached" and lak["history"][-1]["by"] == "family:telegram"


def test_dismissal_on_telegram_never_closes(client, tg):
    link_ravi(client, tg)
    client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED})
    send(client, text(RAVI_CHAT, "delivery aadmele heege, normal"))
    assert lakshmi_ticket().state == "notified"


def test_no_duplicate_alerts_and_one_reminder_per_step(client, tg, clock):
    from app.services import ticket_service

    link_ravi(client, tg)
    client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED, "interaction_id": "d1"})
    client.post(
        "/api/demo/inject",
        json={"mother_id": "m_001", "transcript": RED + "\nUser: tale bhaara", "interaction_id": "d2"},
    )
    alerts = [m for m in to_chat(tg, RAVI_CHAT) if m["text"].startswith("🔴")]
    assert len(alerts) == 1
    with new_session() as s:
        asyncio.run(ticket_service.escalation_tick(s, clock.advance(minutes=11)))
        asyncio.run(ticket_service.escalation_tick(s, clock.advance(seconds=30)))
    reminders = [m for m in to_chat(tg, RAVI_CHAT) if m["text"].startswith("⏰")]
    assert len(reminders) == 1


def test_green_status_once_per_day(client, tg):
    link_ravi(client, tg)
    for iid in ("g1", "g2"):
        client.post("/api/calls", json={"mother_id": "m_001", "purpose": "checkin"})
        client.post(
            "/hooks/on-start",
            headers=AUTH,
            json={"phone": "+919800000001", "interaction_id": iid, "direction": "outbound"},
        )
        client.post("/hooks/on-end", headers=AUTH, json={"phone": "+919800000001", "interaction_id": iid,
                                                         "transcript": "User: ella chennagide", "answered": True})  # fmt: skip
    greens = [m for m in to_chat(tg, RAVI_CHAT) if m["text"].startswith("🟢 Jodi check-in")]
    assert len(greens) == 1 and "no danger signs" in greens[0]["text"]


def test_telegram_failure_never_breaks_tickets(client, tg):
    link_ravi(client, tg)
    tg.fail = True
    r = client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED})
    assert r.status_code == 200 and r.json()["level"] == "red"
    t = lakshmi_ticket()
    assert t.state == "notified" and RAVI in t.assigned_to
    msg = client.get("/api/mothers/m_001/messages").json()[0]
    assert msg["delivered"] is False


# ---------------------------------------------------------------- prescription
def test_prescription_photo_review_confirm(client, tg):
    link_ravi(client, tg)
    send(client, text(RAVI_CHAT, "/prescription"), photo(RAVI_CHAT, "rx_file"))
    review = to_chat(tg, RAVI_CHAT)[-1]
    assert "Labetalol 100 mg twice daily" in review["text"] and review["buttons"][0][0][1] == "rx:ok"
    send(client, callback(RAVI_CHAT, "rx:ok"))
    tl = client.get("/api/mothers/m_001/timeline").json()
    med = next(e for e in tl if e["kind"] == "medicine")
    assert med["source"] == "document_extracted" and "confirmed via Telegram by husband" in med["value"]
    assert any(m["kind"] == "prescription" for m in client.get("/api/mothers/m_001/messages").json())


def test_prescription_wrong_saves_nothing(client, tg):
    link_ravi(client, tg)
    send(client, photo(RAVI_CHAT), callback(RAVI_CHAT, "rx:no"))
    assert not [e for e in client.get("/api/mothers/m_001/timeline").json() if e["kind"] == "medicine"]
    assert "retake" in to_chat(tg, RAVI_CHAT)[-1]["text"]


# ---------------------------------------------------------------- disabled + polling
def test_disabled_sends_nothing_and_has_no_webhook(client, tg, monkeypatch):
    from app.main import create_app

    monkeypatch.setattr(get_settings(), "telegram_enabled", False)
    client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED})
    assert tg.sent == [] and lakshmi_ticket().state == "notified"
    from fastapi.testclient import TestClient

    with TestClient(create_app()) as c2:
        assert c2.post("/hooks/telegram", json=text(1, "/start"), headers=TG).status_code == 404


async def test_polling_loop_handles_updates_and_survives_errors(client, tg):
    from app.jobs import telegram_poller

    tg.updates = [text(4242, "/start")]
    task = asyncio.create_task(telegram_poller.poll_forever())
    for _ in range(50):
        await asyncio.sleep(0.05)
        if to_chat(tg, 4242):
            break
    tg.fail = True  # errors are caught with backoff, never crash
    await asyncio.sleep(0.1)
    assert not task.done()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    tg.updates = []
    assert to_chat(tg, 4242) and to_chat(tg, 4242)[0]["contact"]


def test_demo_reset_keeps_telegram_links(client, tg):
    link_ravi(client, tg)
    assert client.post("/api/demo/reset").status_code == 200
    assert client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED}).json()["level"] == "red"
    assert to_chat(tg, RAVI_CHAT)[-1]["text"].startswith("🔴 URGENT")  # still linked: no re-sharing needed


def test_asha_chat_gets_her_mothers_alerts_and_can_acknowledge(client, tg):
    asha_chat = 7009
    send(client, text(asha_chat, "/start"), contact(asha_chat, "919800000009"))  # Sunita (a_001, Lakshmi's ASHA)
    assert client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED}).json()["level"] == "red"
    alert = to_chat(tg, asha_chat)[-1]
    t = lakshmi_ticket()
    assert alert["text"].startswith("🔴 URGENT") and alert["buttons"][0][0][1] == f"ack:{t.id}"
    send(client, callback(asha_chat, f"ack:{t.id}"))
    assert lakshmi_ticket().state == "acknowledged"


def test_asha_chat_gets_nothing_for_other_ashas_mothers(client, tg):
    other_chat = 7010
    send(client, text(other_chat, "/start"), contact(other_chat, "919800000010"))  # Meena (a_002), not Lakshmi's
    n = len(to_chat(tg, other_chat))
    client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED})
    assert len(to_chat(tg, other_chat)) == n
    t = lakshmi_ticket()
    send(client, callback(other_chat, f"ack:{t.id}"))
    assert lakshmi_ticket().state != "acknowledged"


def test_bot_menu_is_registered_at_startup(client, tg):
    import asyncio

    from app.jobs import telegram_poller

    asyncio.run(telegram_poller.register_commands())
    assert [c for c, _ in tg.commands] == ["status", "prescription", "help", "stop"]


def test_asha_status_lists_her_mothers(client, tg):
    asha_chat = 7011
    send(client, text(asha_chat, "/start"), contact(asha_chat, "919800000009"))  # Sunita, a_001
    client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED})
    send(client, text(asha_chat, "/status"))
    out = to_chat(tg, asha_chat)[-1]["text"]
    assert out.startswith("ASHA Sunita: your mothers today")
    assert "Lakshmi" in out and "(open alert)" in out and "+91" not in out
    send(client, text(asha_chat, "/prescription"), photo(asha_chat))
    assert "family's Jodi chat" in to_chat(tg, asha_chat)[-1]["text"]


def test_clean_start_register_real_mother_rebinds_family_telegram(client, tg):
    from tests.conftest import AUTH

    link_ravi(client, tg)  # husband's chat linked earlier
    assert client.post("/api/demo/reset?mode=clean").status_code == 200
    names = [m["name"] for m in client.get("/api/mothers").json()]
    assert "Lakshmi" not in names  # nobody pre-registered on the mother's phone

    body = {
        "phone": "9800000001", "name": "Meera", "language": "hi", "asha_id": "a_001",
        "delivery_date": "2026-11-12", "delivery_type": "c_section", "complications": ["gestational_hypertension"],
        "baby_birth_weight_grams": 2600, "gestation_weeks": 38,
        "medicines": [{"name": "Labetalol", "dose": "100 mg", "frequency": "twice daily"}],
        "family": [{"name": "Ravi", "relation": "husband", "phone": "919800000002", "decision_maker": True}],
    }  # fmt: skip
    r = client.post("/api/onboarding/register", json=body)
    assert r.status_code == 200, r.text
    m = r.json()["mother"]
    assert m["name"] == "Meera" and m["phone"] == "+919800000001" and m["language"] == "hi"
    assert m["family_phones"][0]["phone"] == RAVI and m["family_phones"][0]["decision_maker"]
    assert m["consent_at"] is None and r.json()["baby"]["birth_weight_grams"] == 2600
    tl = client.get(f"/api/mothers/{m['id']}/timeline").json()
    assert any("Labetalol" in (e["value"] or "") for e in tl)
    assert any("Registered on the dashboard" in (e["value"] or "") for e in tl)
    planned = client.get(f"/api/mothers/{m['id']}/planned-calls").json()
    assert planned and all(c["status"] == "pending" for c in planned)

    ctx = client.post(
        "/hooks/on-start",
        headers=AUTH,
        json={"phone": "+919800000001", "interaction_id": "reg1", "direction": "outbound"},
    ).json()
    assert ctx["call_purpose"] == "onboarding" and ctx["mother_name"] == "Meera"  # her own consent first
    ctx = client.post("/hooks/on-start", headers=AUTH, json={"phone": "+919800000001", "interaction_id": "reg2"}).json()
    assert ctx["call_purpose"] == "inbound"  # if she calls in first: no intro, straight to what is happening

    client.post("/api/demo/inject", json={"mother_id": m["id"], "transcript": RED})
    assert to_chat(tg, RAVI_CHAT)[-1]["text"].startswith("🔴 URGENT — Jodi alert for Meera")  # re-bound by phone


def test_green_status_also_reaches_the_asha(client, tg):
    asha_chat = 7012
    send(client, text(asha_chat, "/start"), contact(asha_chat, "919800000009"))
    client.post(
        "/api/demo/inject", json={"mother_id": "m_001", "transcript": "User: ellaru chennagiddeve, yaava tondare illa"}
    )
    assert any(msg["text"].startswith("🟢") for msg in to_chat(tg, asha_chat))


def _share_msg(tg, chat):
    return next(m["text"] for m in reversed(to_chat(tg, chat)) if "One-time code" in m["text"])


def test_reached_sends_share_link_and_code_doctor_sees_record(client, tg, clock):
    import re

    link_ravi(client, tg)
    client.post("/api/demo/inject", json={"mother_id": "m_001", "transcript": RED})
    t = lakshmi_ticket()
    send(client, callback(RAVI_CHAT, f"reached:{t.id}"))  # family taps "We reached hospital"
    text = _share_msg(tg, RAVI_CHAT)
    url = re.search(r"https?://\S+/share/(\S+)", text)
    code = re.search(r"code: (\d{6})", text).group(1)
    token = url.group(1)
    assert client.get(f"/api/share/{token}/record").status_code == 403  # no code yet
    assert (
        client.post(f"/api/share/{token}/verify", json={"code": "000000" if code != "000000" else "111111"}).status_code
        == 403
    )
    r = client.post(f"/api/share/{token}/verify", json={"code": code})
    assert r.status_code == 200
    session = r.json()["session"]
    rec = client.get(f"/api/share/{token}/record", headers={"X-Share-Session": session})
    assert rec.status_code == 200
    body = rec.json()
    assert body["mother"]["name"] == "Lakshmi" and body["record_verified"] is True
    assert body["alert"]["level"] == "red" and body["danger_signs"]
    assert "+91" not in rec.text  # no phone numbers in the doctor's view
    assert "doctor opened" in to_chat(tg, RAVI_CHAT)[-1]["text"]  # family told
    assert client.post(f"/api/share/{token}/verify", json={"code": code}).status_code == 403  # one-time
    clock.advance(minutes=31)
    assert client.get(f"/api/share/{token}/record", headers={"X-Share-Session": session}).status_code == 403


def test_share_code_locks_after_five_wrong_tries_and_link_revokes(client, tg):
    import re

    link_ravi(client, tg)
    r = client.post("/api/mothers/m_001/share", json={"by": "asha"})
    assert r.status_code == 200 and "code" not in r.json()  # the code never comes back in the API
    token = r.json()["url"].rsplit("/", 1)[-1]
    code = re.search(r"code: (\d{6})", _share_msg(tg, RAVI_CHAT)).group(1)
    wrong = "123456" if code != "123456" else "654321"
    for _ in range(5):
        assert client.post(f"/api/share/{token}/verify", json={"code": wrong}).status_code == 403
    assert client.post(f"/api/share/{token}/verify", json={"code": code}).status_code == 403  # locked
    assert client.post(f"/api/share/{token}/code").status_code == 200  # family asks for a new code
    code2 = re.search(r"code: (\d{6})", _share_msg(tg, RAVI_CHAT)).group(1)
    assert client.post(f"/api/share/{token}/verify", json={"code": code2}).status_code == 200
    assert client.post(f"/api/share/{token}/revoke").status_code == 200
    assert client.post(f"/api/share/{token}/code").status_code == 403


def test_slip_upload_with_unformatted_phone_lands_on_her_registered_record(client):
    r = client.post(
        "/api/onboarding/photo", data={"phone": "9800000001"}, files={"file": ("slip.jpg", b"fake-image", "image/jpeg")}
    )
    assert r.status_code == 200
    body = {
        "phone": "+919800000001",
        "name": "Asha Test",
        "language": "kn",
        "delivery_date": "2026-11-12",
        "delivery_type": "normal",
        "family": [{"name": "H", "relation": "husband", "phone": "9800000002"}],
    }
    m = client.post("/api/onboarding/register", json=body).json()["mother"]
    assert m["baby"] is not None  # embedded, never null
    phones = [x["phone"] for x in client.get("/api/mothers").json()]
    assert phones.count("+919800000001") == 1 and "9800000001" not in phones


def test_register_places_the_first_call_straight_away(client):
    from app.integrations.registry import get_integrations

    placed = get_integrations().call_placer.placed
    n = len(placed)
    body = {
        "phone": "+919811111111",
        "name": "Rekha",
        "language": "kn",
        "delivery_date": "2026-11-12",
        "delivery_type": "normal",
        "family": [{"name": "H", "relation": "husband", "phone": "9822222222"}],
    }
    assert client.post("/api/onboarding/register", json=body).status_code == 200
    assert [p[:2] for p in placed[n:]] == [("+919811111111", "onboarding")]
    body["call_now"] = False
    client.post("/api/onboarding/register", json={**body, "phone": "+919833333333"})
    assert len(placed) == n + 1

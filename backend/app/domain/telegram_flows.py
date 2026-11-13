"""Telegram conversation state machine. Pure: step(state, data, event) → StepResult.

Linking: /start → share phone (contact button) → backend lookup → linked, or onboarding.
Onboarding: ask_role → mother_name → [mother_phone] → delivery_date → delivery_type →
baby_weight → born_early → decision maker → language → upload_slip → review → consent.
Side effects (DB lookups, slip reading, saving) are returned as Effects; the service runs
them and feeds the result back as an event. Unexpected input never crashes: it re-asks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

from app.domain import telegram_inputs as ti
from app.domain.messages import render
from app.domain.telegram_prompts import (
    DM_CHAIN,
    FIELD_LABELS,
    HELP,
    INVALID,
    PROMPTS,
    SHARE_PHONE,
    Buttons,
)


@dataclass(frozen=True)
class Event:
    kind: str  # text | contact | photo | callback | command | lookup | slip | rx
    text: str = ""
    phone: str = ""
    own_contact: bool = True
    first_name: str = ""
    file_id: str = ""
    result: dict[str, Any] = field(default_factory=dict)
    today: date = date(2026, 1, 1)


@dataclass(frozen=True)
class Reply:
    text: str
    buttons: Buttons = field(default_factory=list)
    request_contact: str | None = None


@dataclass(frozen=True)
class Effect:
    kind: str  # lookup | read_slip | save_onboarding | read_rx | save_rx | status | stop
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass
class StepResult:
    state: str
    data: dict[str, Any]
    replies: list[Reply] = field(default_factory=list)
    effects: list[Effect] = field(default_factory=list)


def prompt(state: str) -> Reply:
    text, buttons = PROMPTS.get(state, ("Please continue.", []))
    return Reply(text, buttons)


def contact_prompt() -> Reply:
    return Reply("To link this chat, please share your phone number using the button below.",
                 request_contact=SHARE_PHONE)  # fmt: skip


def _order(data: dict[str, Any]) -> list[str]:
    head = ["mother_name"] + (["mother_phone"] if data.get("role") == "family" else [])
    dm = ["dm_choice"] if data.get("role") == "family" else ["dm_name"]
    return head + ["delivery_date", "delivery_type", "baby_weight", "born_early"] + dm + ["language", "upload_slip"]


def _next(state: str, data: dict[str, Any]) -> str:
    """Next question after a valid answer to `state` (the decision-maker sub-chain runs to the end)."""
    if state in ("dm_name", "dm_relation"):
        return DM_CHAIN[DM_CHAIN.index(state) + 1]
    if state == "dm_choice" and data.get("dm_name") is None:
        return "dm_name"
    if data.get("editing"):
        return "review"
    order = _order(data)
    if state == "ask_role":
        return order[0]
    if state in ("dm_choice", "dm_phone"):
        state = "dm_choice" if "dm_choice" in order else "dm_name"
    i = order.index(state)
    return order[i + 1] if i + 1 < len(order) else "review"


def review_reply(data: dict[str, Any]) -> Reply:
    lines = []
    for key, label in FIELD_LABELS:
        val = data.get(key)
        if key == "mother_phone" and data.get("role") == "mother":
            continue
        if key == "baby_weight" and val:
            val = f"{val / 1000:g} kg"
        if key == "dm_name" and val:
            val = f"{val} ({data.get('dm_relation', 'family').replace('_', ' ')}, ••••{str(data.get('dm_phone', ''))[-4:]})"
        if val not in (None, ""):
            lines.append(f"• {label}: {str(val).replace('_', '-')}")
    for med in (data.get("slip_fields") or {}).get("medicines") or []:
        lines.append(f"• Medicine (from slip): {' '.join(x for x in (med.get('name'), med.get('dose')) if x)}")
    text = render("ONBOARDING_REVIEW", fields="\n".join(lines))
    return Reply(text, [[("✅ Confirm", "ob:review:ok"), ("✏️ Edit", "ob:review:edit")]])


def _edit_menu(data: dict[str, Any]) -> Reply:
    keys = [k for k, _ in FIELD_LABELS if not (k == "mother_phone" and data.get("role") == "mother")]
    rows = [[(label, f"ob:edit:{k}")] for k, label in FIELD_LABELS if k in keys]
    return Reply("What would you like to change?", rows)


def _go(state: str, data: dict[str, Any], extra: list[Reply] | None = None) -> StepResult:
    reply = review_reply(data) if state == "review" else prompt(state)
    return StepResult(state, data, [*(extra or []), reply])


def _cb(event: Event, prefix: str) -> str | None:
    if event.kind == "callback" and event.text.startswith(f"ob:{prefix}:"):
        return event.text.split(":", 2)[2]
    return None


# ------------------------------------------------------------------ field handlers
def _answer(state: str, data: dict[str, Any], ev: Event) -> tuple[bool, dict[str, Any]]:
    """Validate the answer for `state`. Returns (ok, updated data)."""
    t = ev.text if ev.kind == "text" else ""
    d = dict(data)
    if state == "ask_role" and (v := _cb(ev, "role")):
        d["role"] = v
        if v == "mother":
            d["mother_phone"] = d.get("registrant_phone")
        return True, d
    if state in ("mother_name", "dm_name") and (v := ti.parse_name(t)):
        d[state] = v
        return True, d
    if state in ("mother_phone", "dm_phone") and (v := ti.parse_phone(t)):
        d[state] = v
        return True, d
    if state == "delivery_date":
        dd = None
        if (v := _cb(ev, "date")) and v.isdigit():
            dd = ti.parse_delivery_date(f"{v} days ago" if v != "0" else "today", ev.today)
        elif t:
            dd = ti.parse_delivery_date(t, ev.today)
        if dd:
            d["delivery_date"] = dd.isoformat()
            return True, d
    if state == "delivery_type" and (v := _cb(ev, "type") or ti.parse_choice(t, ti.DELIVERY_TYPES)):
        d["delivery_type"] = v
        return True, d
    if state == "baby_weight" and (v := ti.parse_weight_grams(t)):
        d["baby_weight"] = v
        return True, d
    if state == "born_early" and (v := _cb(ev, "early")):
        d["born_early"] = v
        return True, d
    if state == "dm_choice" and (v := _cb(ev, "dm")):
        if v == "me":
            d.update(dm_name=d.get("registrant_name") or "Me", dm_relation=d.get("registrant_relation", "family"),
                     dm_phone=d.get("registrant_phone"))  # fmt: skip
        else:
            d.pop("dm_name", None)
        return True, d
    if state == "dm_relation" and (v := _cb(ev, "rel") or ti.parse_choice(t, ti.RELATIONS)):
        d["dm_relation"] = v
        return True, d
    if state == "language" and (v := _cb(ev, "lang") or ti.parse_choice(t, ti.LANGUAGES)):
        d["language"] = v
        return True, d
    return False, d


def _command(state: str, data: dict[str, Any], ev: Event) -> StepResult:
    cmd = ev.text.lower()
    linked = state.startswith("linked") or state.startswith("rx_")
    if cmd == "/help":
        return StepResult(state, data, [Reply(HELP)])
    if cmd == "/start":
        if linked:
            return StepResult("linked", data, [Reply("This chat is already linked to Jodi. " + HELP)])
        return StepResult("await_contact", {}, [contact_prompt()])
    if cmd == "/stop":
        return StepResult("new", {}, [Reply("Jodi messages are stopped in this chat. Send /start to link again.")],
                          [Effect("stop")])  # fmt: skip
    if not linked:
        return StepResult(state, data, [Reply("Please send /start and share your phone number first.")])
    if cmd == "/status":
        return StepResult("linked", data, [], [Effect("status")])
    if cmd == "/prescription":
        return StepResult("rx_wait", data, [Reply("Please send a clear photo of the prescription.")])
    return StepResult(state, data, [Reply(HELP)])


def _onboarding(state: str, data: dict[str, Any], ev: Event) -> StepResult:
    if state == "review":
        if _cb(ev, "review") == "ok":
            return StepResult("consent", data, [prompt("consent")])
        if _cb(ev, "review") == "edit":
            return StepResult("review_edit", data, [_edit_menu(data)])
        return _go("review", data)
    if state == "review_edit":
        field_key = _cb(ev, "edit")
        if field_key in {k for k, _ in FIELD_LABELS}:
            target = "dm_name" if field_key == "dm_name" else field_key
            return _go(target, {**data, "editing": True})
        return StepResult(state, data, [_edit_menu(data)])
    if state == "consent":
        v = _cb(ev, "consent")
        if v == "yes":
            return StepResult("saving", data, [Reply("Saving…")], [Effect("save_onboarding", dict(data))])
        if v == "no":
            return StepResult("review", data, [Reply("Okay. Without consent Jodi cannot keep the record. "
                                                     "Tap Confirm when you are ready."), review_reply(data)])  # fmt: skip
        return _go("consent", data)
    if state == "upload_slip":
        if ev.kind == "photo":
            return StepResult(
                "reading_slip", data, [Reply("Reading your slip…")], [Effect("read_slip", {"file_id": ev.file_id})]
            )
        if _cb(ev, "skip") is not None or ev.text.lower() == "ob:skip" or ev.text.lower() == "skip":
            return _go("review", data)
        return _go("upload_slip", data)
    if state == "reading_slip":
        if ev.kind == "slip":
            fields = ev.result.get("fields") or {}
            note = [] if ev.result.get("ok") else [Reply("I couldn't read the slip. You can still continue.")]
            return _go("review", {**data, "slip_fields": fields}, note)
        return StepResult(state, data, [Reply("Still reading your slip…")])
    ok, new = _answer(state, data, ev)
    if not ok:
        hint = INVALID.get(state)
        return StepResult(state, data, [*([Reply(hint)] if hint and ev.kind == "text" else []), prompt(state)])
    if state == "ask_role":
        new.pop("editing", None)
    return _go(_next(state, new), new)


def _linked(state: str, data: dict[str, Any], ev: Event) -> StepResult:
    if state in ("linked", "rx_wait") and ev.kind == "photo":
        return StepResult(
            "rx_reading", data, [Reply("Reading the prescription…")], [Effect("read_rx", {"file_id": ev.file_id})]
        )
    if state == "rx_reading":
        if ev.kind != "rx":
            return StepResult(state, data, [Reply("Still reading the prescription…")])
        meds = ev.result.get("medicines") or []
        if not meds:
            return StepResult("linked", data, [Reply("I couldn't read any medicines. Please retake the photo in good "
                                                     "light, or tell Jodi on the next call.")])  # fmt: skip
        lines = "\n".join(
            f"• {' '.join(x for x in (m.get('name'), m.get('dose'), m.get('frequency')) if x)}" for m in meds
        )
        return StepResult("rx_review", {**data, "rx": meds}, [Reply(render("PRESCRIPTION_REVIEW", medicines=lines),
                          [[("✅ Correct", "rx:ok"), ("❌ Wrong", "rx:no")]])])  # fmt: skip
    if state == "rx_review" and ev.kind == "callback" and ev.text in ("rx:ok", "rx:no"):
        rest = {k: v for k, v in data.items() if k != "rx"}
        if ev.text == "rx:ok":
            return StepResult(
                "linked", rest, [Reply("Saved ✅ Thank you.")], [Effect("save_rx", {"medicines": data.get("rx", [])})]
            )
        return StepResult(
            "linked", rest, [Reply("Okay, not saved. Please retake the photo, or tell Jodi on the next call.")]
        )
    return StepResult("linked" if state == "rx_wait" and ev.kind == "text" else state, data, [Reply(HELP)])


def step(state: str, data: dict[str, Any], event: Event) -> StepResult:
    data = dict(data or {})
    if event.kind == "command":
        return _command(state, data, event)
    if state in ("new", ""):
        return StepResult("await_contact", {}, [contact_prompt()])
    if state == "await_contact":
        if event.kind != "contact":
            return StepResult(state, data, [contact_prompt()])
        if not event.own_contact or not ti.normalize_contact_phone(event.phone):
            return StepResult(state, data, [Reply("Please use the button to share your own number."), contact_prompt()])
        phone = ti.normalize_contact_phone(event.phone)
        new = {"registrant_phone": phone, "registrant_name": event.first_name}
        return StepResult("checking", new, [], [Effect("lookup", {"phone": phone})])
    if state == "checking":
        if event.kind != "lookup":
            return StepResult(state, data, [Reply("One moment…")])
        if event.result.get("role"):
            return StepResult("linked", data, [Reply(f"Linked ✅ You will get Jodi updates for {event.result.get('name')}. "
                                                     + HELP)])  # fmt: skip
        return StepResult("ask_role", data, [Reply("This number is not registered with Jodi yet. Let's register."),
                                             prompt("ask_role")])  # fmt: skip
    if state.startswith("linked") or state.startswith("rx_"):
        return _linked(state, data, event)
    if state == "saving":
        return StepResult(state, data, [Reply("Saving…")])
    return _onboarding(state, data, event)

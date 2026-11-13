"""Simulate Telegram updates against /hooks/telegram (no phone needed).

    python -m app.scripts.tg_simulate link            # Ravi (+919800000002) links to Lakshmi
    python -m app.scripts.tg_simulate onboard         # a new family member onboards a new mother
    python -m app.scripts.tg_simulate ack <ticket_id> # tap "✅ I'm on it" on an alert
    python -m app.scripts.tg_simulate reached <ticket_id>
    python -m app.scripts.tg_simulate status

Needs the backend running with TELEGRAM_ENABLED=true, TELEGRAM_MODE=webhook and
TELEGRAM_WEBHOOK_SECRET set (use TELEGRAM_MOCK=true to keep replies in memory). Replies go to
the (mock) bot, not to this script; watch the server log or GET /api/mothers/{id}/messages.
"""

from __future__ import annotations

import itertools
import os
import sys
import time
from typing import Any

import httpx

BASE = os.environ.get("JODI_BASE", "http://localhost:8000")
SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
_ids = itertools.count(int(time.time()))


def _post(update: dict[str, Any]) -> None:
    r = httpx.post(f"{BASE}/hooks/telegram", json=update, headers={"X-Telegram-Bot-Api-Secret-Token": SECRET})
    print(r.status_code, update.get("message", {}).get("text") or update.get("callback_query", {}).get("data") or "")


def message(chat: int, **body: Any) -> None:
    _post({"update_id": next(_ids), "message": {"chat": {"id": chat}, "from": {"id": chat}, **body}})


def tap(chat: int, data: str) -> None:
    n = next(_ids)
    _post({"update_id": n, "callback_query": {"id": f"cb{n}", "data": data, "from": {"id": chat},
                                              "message": {"chat": {"id": chat}}}})  # fmt: skip


def link(chat: int = 7002, phone: str = "919800000002") -> None:
    message(chat, text="/start")
    message(chat, contact={"phone_number": phone, "user_id": chat, "first_name": "Ravi"})


def onboard(chat: int = 6001) -> None:
    link(chat, "919811111111")  # unknown number → onboarding starts
    tap(chat, "ob:role:family")
    message(chat, text="Divya")
    message(chat, text="9822222222")
    for data in ("ob:date:1", "ob:type:c_section"):
        tap(chat, data)
    message(chat, text="2.6 kg")
    for data in ("ob:early:no", "ob:dm:me", "ob:lang:kn"):
        tap(chat, data)
    message(chat, photo=[{"file_id": "slip_photo"}])
    for data in ("ob:review:ok", "ob:consent:yes"):
        tap(chat, data)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "link"
    if cmd == "link":
        link()
    elif cmd == "onboard":
        onboard()
    elif cmd in ("ack", "reached") and len(sys.argv) > 2:
        tap(7002, f"{cmd}:{sys.argv[2]}")
    elif cmd == "status":
        message(7002, text="/status")
    else:
        sys.exit(__doc__)

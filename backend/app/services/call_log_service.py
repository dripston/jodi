"""Readable per-call conversation logs on disk: backend/call_logs/<date>/<call>.txt.

What Jodi said and what the caller said (words as spoken + English), then what was recorded and
the call's level. Health conversations: the folder is git-ignored and only written when
CALL_LOGS_ENABLED is true. The full transcript also stays in the database (GET /api/calls/{id}).
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import log, mask_phone
from app.core.time import to_ist
from app.db.models import CallLog, Mother
from app.domain.transcript import display_turns

logger = logging.getLogger(__name__)


def _safe(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", name).strip("_")[:120] or "call"


def write(call: CallLog, mother: Mother | None, level: str | None, recorded: list[str], now: datetime) -> Path | None:
    """Write (or rewrite) the call's log file. Never raises: a failed log must not break the call flow."""
    s = get_settings()
    if not s.call_logs_enabled or not (call.transcript or "").strip():
        return None
    try:
        when = to_ist(call.started_at or now)
        caller = mother.name if (mother and call.caller_role == "mother") else (call.caller_role or "caller").title()
        lines = [
            f"Call {call.interaction_id}",
            f"When: {when:%d %b %Y, %H:%M} IST   Direction: {call.direction}   Purpose: {call.purpose}",
            f"Mother: {mother.name if mother else 'unknown'}   Caller: {caller} ({mask_phone(call.phone)})",
            f"Duration: {call.duration_seconds or 0} s   Level: {(level or 'n/a').upper()}   Outcome: {call.outcome or '-'}",
            "",
            "--- Conversation ---",
        ]
        for t in display_turns(call.transcript or ""):
            who = "Jodi" if t["role"] == "agent" else caller
            lines.append(f"{who}: {t['text']}")
            if t["en"]:
                lines.append(f"{' ' * (len(who) + 2)}({t['en']})")
        lines += ["", "--- Recorded in her health record ---", *(f"- {r}" for r in recorded or ["(nothing new)"])]
        folder = s.call_logs_dir / f"{when:%Y-%m-%d}"
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{when:%H%M}_{_safe(call.interaction_id)}.txt"
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        log(logger, "call log written", interaction_id=call.interaction_id, path=str(path))
        return path
    except Exception as exc:  # noqa: BLE001
        log(logger, "call log failed", logging.WARNING, interaction_id=call.interaction_id, error=type(exc).__name__)
        return None

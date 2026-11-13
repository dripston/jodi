"""Transcript helpers (pure): keep only what the caller said, not Jodi's own questions.

Sarvam's @CallTranscript may arrive as plain text, as role-prefixed lines
("User: …" / "Agent: …"), or as a JSON list of {role, content}. Jodi's own turns must
never trigger facts or the safety net ("Did she have any fits?" is not a danger sign).
"""

from __future__ import annotations

import json
import re

AGENT_ROLES = frozenset({"agent", "assistant", "bot", "jodi", "ai", "system"})
CALLER_ROLES = frozenset({"user", "customer", "caller", "human", "mother", "family", "asha", "doctor"})
_PREFIX = re.compile(r"^\s*\[?([A-Za-z_ ]{2,12})\]?\s*[:：-]\s*(.*)$")


def _from_json(transcript: str) -> list[tuple[str, str]] | None:
    try:
        data = json.loads(transcript)
    except (ValueError, TypeError):
        return None
    if not isinstance(data, list):
        return None
    turns: list[tuple[str, str]] = []
    for item in data:
        if not isinstance(item, dict):
            return None
        role = str(item.get("role") or item.get("speaker") or "").lower()
        text = str(item.get("content") or item.get("text") or item.get("en_text") or item.get("message") or "")
        turns.append((role, text))
    return turns


def split_turns(transcript: str) -> list[tuple[str, str]]:
    """Return (role, text) turns; role '' when the transcript has no speaker labels."""
    if not transcript:
        return []
    as_json = _from_json(transcript.strip())
    if as_json is not None:
        return as_json
    turns: list[tuple[str, str]] = []
    labelled = False
    for line in transcript.splitlines():
        m = _PREFIX.match(line)
        role = m.group(1).strip().lower() if m else ""
        if m and (role in AGENT_ROLES or role in CALLER_ROLES):
            labelled = True
            turns.append((role, m.group(2)))
        elif turns and labelled:
            r, t = turns[-1]
            turns[-1] = (r, f"{t} {line.strip()}".strip())
        else:
            turns.append(("", line))
    return turns


def caller_text(transcript: str) -> str:
    """Only the caller's words (all text if there are no speaker labels)."""
    return "\n".join(t for role, t in split_turns(transcript) if role not in AGENT_ROLES).strip()


def _script_counts(text: str) -> tuple[int, int]:
    deva = sum(1 for ch in text if "ऀ" <= ch <= "ॿ")
    kann = sum(1 for ch in text if "ಀ" <= ch <= "೿")
    return deva, kann


def spoken_language(transcript: str) -> str | None:
    """Language of the caller's latest words, from the script the speech-to-text wrote them in:
    Devanagari → "hi", Kannada script → "kn". Romanised or mixed/unclear text → None (keep the
    call's language). Lets a mid-call switch to Hindi get the Hindi script even if Sarvam's
    `language` variable still says Kannada."""
    turns = [t for role, t in split_turns(transcript) if role not in AGENT_ROLES and t.strip()]
    for text in reversed(turns[-3:]):
        deva, kann = _script_counts(text)
        if deva >= 3 and deva > 2 * kann:
            return "hi"
        if kann >= 3 and kann > 2 * deva:
            return "kn"
    return None

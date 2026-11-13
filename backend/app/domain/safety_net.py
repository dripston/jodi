"""Keyword safety net (docs/clinical-rules.md) — runs on the raw caller transcript,
independently of the LLM. Any hit forces at least red with rule K-SAFETY-01. Pure.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.domain.transcript import caller_text

KEYWORDS: tuple[str, ...] = (
    "fits", "jhatke", "daura", "unconscious", "behosh", "not breathing",
    "saans nahi", "usiru illa", "blue lips", "neela",
)  # fmt: skip

BABY_WORDS: tuple[str, ...] = ("baby", "magu", "maga", "bachcha", "bachche", "shishu", "infant")

_PATTERNS = [(kw, re.compile(rf"(?<!\w){re.escape(kw)}(?!\w)", re.IGNORECASE)) for kw in KEYWORDS]
_BABY = re.compile(rf"(?<!\w)({'|'.join(BABY_WORDS)})(?!\w)", re.IGNORECASE)
_SENTENCE_SPLIT = re.compile(r"(?:[!?।\n]|\.(?!\d))+")


@dataclass(frozen=True)
class SafetyNetResult:
    fired: bool
    keywords: tuple[str, ...] = ()
    subject: str | None = None  # "mother" | "baby"


def check(transcript: str) -> SafetyNetResult:
    text = caller_text(transcript)
    hits: list[str] = []
    baby_hit = False
    for sentence in _SENTENCE_SPLIT.split(text):
        for kw, pat in _PATTERNS:
            if pat.search(sentence):
                hits.append(kw)
                baby_hit = baby_hit or bool(_BABY.search(sentence))
    if not hits:
        return SafetyNetResult(fired=False)
    return SafetyNetResult(
        fired=True,
        keywords=tuple(dict.fromkeys(hits)),
        subject="baby" if baby_hit else "mother",
    )

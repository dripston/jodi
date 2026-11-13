"""Fixed scripts from docs/red-scripts.md, keyed by (script_id, language). Never generated.

English is the master text. A language variant may be added to the doc as a blockquote
line prefixed with the language code, e.g. `> **kn:** "…"`. Until a native-speaker version
exists, the English master is returned (and the fallback is logged by the caller).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

_HEADING = re.compile(r"^##\s+([A-Z][A-Z0-9-]+)\b")
_QUOTE = re.compile(r"^>\s*(?:\*\*(?P<lang>[a-z]{2}):\*\*\s*|(?P<lang2>[a-z]{2}):\s+)?[\"“](?P<text>.+?)[\"”]\s*$")
_BABY_VERSION = re.compile(r"^\(Baby version:\s*[\"“](?P<text>.+?)[\"”]\)\s*$")

SCRIPT_IDS = (
    "RED-MOTHER", "RED-BABY", "RED-FITS", "RED-FITS-BABY", "RED-BLEED", "AMBER-MOTHER",
    "AMBER-BABY", "DISMISSAL-RESPONSE", "FAMILY-ALERT", "NOT-ALLOWED",
)  # fmt: skip

DEFAULT_FACILITY = "the nearest government hospital"
_DEFAULT_FACILITY = {"kn": "ಹತ್ತಿರದ ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ", "hi": "नज़दीकी सरकारी अस्पताल"}
_PRONOUN = {"kn": "ಅವರ", "hi": "उन"}  # stands in for a missing {name} mid-sentence


def _clean(text: str) -> str:
    # The doc abbreviates some variants with a trailing ellipsis; never read "…" aloud.
    text = text.strip().rstrip("…").strip()
    if text.endswith(("।", "?", "!")):  # Hindi danda etc.: keep the script's own full stop
        return text
    return text.rstrip(".").strip() + "."


def parse_scripts(markdown: str) -> dict[tuple[str, str], str]:
    table: dict[tuple[str, str], str] = {}
    current: str | None = None
    for raw in markdown.splitlines():
        line = raw.strip()
        h = _HEADING.match(line)
        if h:
            current = h.group(1)
            continue
        if current is None:
            continue
        q = _QUOTE.match(line)
        if q:
            lang = q.group("lang") or q.group("lang2") or "en"
            table.setdefault((current, lang), _clean(q.group("text")))
            continue
        b = _BABY_VERSION.match(line)
        if b:
            table.setdefault((f"{current}-BABY", "en"), _clean(b.group("text")))
    return table


@dataclass(frozen=True)
class ScriptBook:
    table: dict[tuple[str, str], str]

    @classmethod
    def load(cls, path: Path) -> ScriptBook:
        return cls(parse_scripts(path.read_text(encoding="utf-8")))

    def get(self, script_id: str, language: str) -> tuple[str, str]:
        """Return (text, language actually used). Falls back to English master text."""
        if (script_id, language) in self.table:
            return self.table[(script_id, language)], language
        if (script_id, "en") in self.table:
            return self.table[(script_id, "en")], "en"
        raise KeyError(f"script {script_id} missing from docs/red-scripts.md")

    def render(
        self, script_id: str, language: str, name: str | None = None, facility: str | None = None
    ) -> tuple[str, str]:
        text, used = self.get(script_id, language)
        text = text.replace("{facility}", facility or _DEFAULT_FACILITY.get(used, DEFAULT_FACILITY))
        if name:
            text = text.replace("{name}", name)
        else:
            text = re.sub(r"^\{name\},\s*", "", text).replace("{name}", _PRONOUN.get(used, "her"))
            text = text[:1].upper() + text[1:]
        return text, used

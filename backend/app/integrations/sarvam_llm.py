"""Fact extraction via Sarvam-105B Structured Outputs (contracts §3) — Protocol + real + mock."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import date
from pathlib import Path
from typing import Any, Protocol

import httpx

from app.core.config import Settings
from app.core.logging import log
from app.domain.facts import BABY_CODES, MOTHER_CODES
from app.domain.transcript import split_turns
from app.domain.updates import parse_onboarding
from app.integrations import lexicon_extractor

logger = logging.getLogger(__name__)
PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "extraction_system.md"

EXTRACTION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["facts", "dismissal_detected", "needs_clarification"],
    "properties": {
        "facts": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["subject", "code", "present", "value", "numeric_value", "unit", "quote", "confidence"],
                "properties": {
                    "subject": {"type": "string", "enum": ["mother", "baby"]},
                    "code": {"type": "string"},
                    "present": {"type": "boolean"},
                    "value": {"type": ["string", "null"]},
                    "numeric_value": {"type": ["number", "null"]},
                    "unit": {"type": ["string", "null"]},
                    "quote": {"type": "string"},
                    "confidence": {"type": "number"},
                },
            },
        },
        "dismissal_detected": {"type": "boolean"},
        "needs_clarification": {"type": "array", "items": {"type": "string"}},
    },
}

ONBOARDING_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["delivery_date", "delivery_type", "complications", "baby_birth_weight_grams",
                 "gestation_weeks", "medicines", "language", "family_contact"],
    "properties": {
        "delivery_date": {"type": ["string", "null"], "description": "YYYY-MM-DD"},
        "delivery_type": {"type": ["string", "null"], "enum": ["normal", "c_section", "assisted", None]},
        "complications": {"type": "array", "items": {"type": "string"}},
        "baby_birth_weight_grams": {"type": ["integer", "null"]},
        "gestation_weeks": {"type": ["integer", "null"]},
        "medicines": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["name", "dose", "frequency"],
            "properties": {"name": {"type": "string"}, "dose": {"type": ["string", "null"]},
                           "frequency": {"type": ["string", "null"]}}}},
        "language": {"type": ["string", "null"], "enum": ["kn", "hi", "en", None]},
        "family_contact": {"type": ["object", "null"], "additionalProperties": False,
                           "required": ["name", "relation", "phone"],
                           "properties": {"name": {"type": "string"}, "relation": {"type": "string"},
                                          "phone": {"type": "string"}}},
    },
}  # fmt: skip


class ExtractionError(Exception):
    pass


class Extractor(Protocol):
    async def extract(self, transcript: str, context: str) -> dict[str, Any]: ...

    async def extract_onboarding(self, transcript: str, today: date) -> dict[str, Any]: ...


def build_system_prompt(docs_dir: Path) -> str:
    template = PROMPT_PATH.read_text(encoding="utf-8")
    lexicon_path = docs_dir / "phrase-lexicon.md"
    lexicon = lexicon_path.read_text(encoding="utf-8") if lexicon_path.exists() else ""
    return (
        template.replace("{{MOTHER_CODES}}", ", ".join(sorted(MOTHER_CODES)))
        .replace("{{BABY_CODES}}", ", ".join(sorted(BABY_CODES)))
        .replace("{{PHRASE_LEXICON}}", lexicon)
    )


def format_transcript(transcript: str) -> str:
    turns = split_turns(transcript)
    if not any(role for role, _ in turns):
        return transcript
    return "\n".join(f"{(role or 'caller').upper()}: {text}" for role, text in turns)


class MockExtractor:
    """Deterministic, offline (SARVAM_MOCK=true)."""

    async def extract(self, transcript: str, context: str) -> dict[str, Any]:
        return lexicon_extractor.extract(transcript)

    async def extract_onboarding(self, transcript: str, today: date) -> dict[str, Any]:
        return parse_onboarding(transcript, today)


class SarvamExtractor:
    def __init__(self, settings: Settings) -> None:
        self._s = settings
        self._system = build_system_prompt(settings.docs_dir)

    async def _complete(self, system: str, user: str, schema_name: str, schema: dict[str, Any]) -> dict[str, Any]:
        body = {
            "model": self._s.sarvam_llm_model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "temperature": 0.0,
            "max_tokens": 2048,
            "reasoning_effort": None,
            "response_format": {"type": "json_schema",
                                "json_schema": {"name": schema_name, "strict": True, "schema": schema}},
        }  # fmt: skip
        headers = {"api-subscription-key": self._s.sarvam_api_key, "Content-Type": "application/json"}
        last: Exception | None = None
        for attempt in range(self._s.llm_retries + 1):
            started = time.perf_counter()
            try:
                async with httpx.AsyncClient(timeout=self._s.llm_timeout_s) as client:
                    resp = await client.post(self._s.sarvam_llm_url, json=body, headers=headers)
                resp.raise_for_status()
                content = resp.json()["choices"][0]["message"]["content"]
                log(logger, "llm extraction ok", schema=schema_name, attempt=attempt,
                    ms=round((time.perf_counter() - started) * 1000))  # fmt: skip
                return json.loads(content)
            except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
                last = exc
                log(logger, "llm extraction failed", logging.WARNING, schema=schema_name,
                    attempt=attempt, error=type(exc).__name__)  # fmt: skip
                await asyncio.sleep(0.2)
        raise ExtractionError(str(last))

    async def extract(self, transcript: str, context: str) -> dict[str, Any]:
        if not self._s.sarvam_api_key:
            raise ExtractionError("SARVAM_API_KEY not set")
        user = f"Context: {context}\n\nTranscript:\n{format_transcript(transcript)}"
        return await self._complete(self._system, user, "jodi_facts", EXTRACTION_SCHEMA)

    async def extract_onboarding(self, transcript: str, today: date) -> dict[str, Any]:
        if not self._s.sarvam_api_key:
            raise ExtractionError("SARVAM_API_KEY not set")
        system = (
            "You extract onboarding details for a postpartum care record from a phone call "
            "transcript (Kannada, Hindi, English or code-mixed). Only use what the CALLER said. "
            f"Today is {today.isoformat()}; convert relative dates to YYYY-MM-DD. Use null when "
            "not said. Never guess numbers. Complications use snake_case English "
            "(e.g. high_bp_in_pregnancy, diabetes_in_pregnancy, bleeding_at_delivery). "
            "Phone numbers in E.164 (+91...)."
        )
        raw = await self._complete(system, format_transcript(transcript), "jodi_onboarding", ONBOARDING_SCHEMA)
        fields = {k: v for k, v in raw.items() if v not in (None, [], "")}
        if fam := fields.get("family_contact"):
            fam["decision_maker"] = True
        return fields

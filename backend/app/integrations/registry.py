"""Picks real or mock integrations (SARVAM_MOCK=true → all deterministic mocks)."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from app.core.config import get_settings
from app.integrations.sarvam_calls import CallPlacer, MockCallPlacer, SarvamCallPlacer
from app.integrations.sarvam_docai import DocReader, MockDocReader, SarvamDocReader
from app.integrations.sarvam_llm import Extractor, MockExtractor, SarvamExtractor


@dataclass
class Integrations:
    extractor: Extractor
    doc_reader: DocReader
    call_placer: CallPlacer


@lru_cache
def get_integrations() -> Integrations:
    s = get_settings()
    if s.sarvam_mock:
        return Integrations(MockExtractor(), MockDocReader(), MockCallPlacer())
    return Integrations(SarvamExtractor(s), SarvamDocReader(s), SarvamCallPlacer(s))

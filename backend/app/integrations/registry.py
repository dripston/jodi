"""Picks real or mock integrations (SARVAM_MOCK=true → all deterministic mocks)."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from app.core.config import Settings, get_settings
from app.integrations.sarvam_calls import CallPlacer, MockCallPlacer, SarvamCallPlacer
from app.integrations.sarvam_docai import DocReader, MockDocReader, SarvamDocReader
from app.integrations.sarvam_llm import Extractor, MockExtractor, SarvamExtractor
from app.integrations.telegram import MockTelegramClient, RealTelegramClient, TelegramClient


@dataclass
class Integrations:
    extractor: Extractor
    doc_reader: DocReader
    call_placer: CallPlacer
    telegram: TelegramClient


def telegram_client(s: Settings) -> TelegramClient:
    """Mock when TELEGRAM_MOCK=true, or when SARVAM_MOCK=true and no token is set."""
    if s.telegram_mock or (s.sarvam_mock and not s.telegram_bot_token) or not s.telegram_bot_token:
        return MockTelegramClient()
    return RealTelegramClient(s.telegram_bot_token, s.telegram_timeout_s)


@lru_cache
def get_integrations() -> Integrations:
    s = get_settings()
    tg = telegram_client(s)
    if s.sarvam_mock:
        return Integrations(MockExtractor(), MockDocReader(), MockCallPlacer(), tg)
    return Integrations(SarvamExtractor(s), SarvamDocReader(s), SarvamCallPlacer(s), tg)

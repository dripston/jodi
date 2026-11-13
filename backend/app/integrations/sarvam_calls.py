"""Outbound calls via Sarvam Instant Outbound — Protocol + real + mock.

Route and body follow docs.sarvam.ai/voice-agents/api/instant-outbound/create (checked
2026-11-13): POST {base}/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds with header
X-API-Key, body {app_config{app_id, app_version, connection_config{connection_id,
agent_phone_number}, agent_variables, app_overrides{initial_language_name}}, user_config
{user_phone_number}, webhook_config{url, metadata}} → {"attempt_id": "..."}.
Still compare with the dashboard "Deploy with Code" recipe before the first live call.

Instant Outbound returns an attempt id, not the voice interaction id; we keep it as
`attempt_id` and bind the real interaction id on /hooks/on-start or the status webhook.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass
from typing import Any, Protocol

import httpx

from app.core.config import Settings
from app.core.errors import IntegrationNotConfigured
from app.core.logging import log, mask_phone, mask_text

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PlacedCall:
    attempt_id: str


class CallPlacer(Protocol):
    async def place_call(self, phone: str, purpose: str, variables: dict[str, str]) -> PlacedCall: ...


class MockCallPlacer:
    def __init__(self) -> None:
        self.placed: list[tuple[str, str, dict[str, str]]] = []

    async def place_call(self, phone: str, purpose: str, variables: dict[str, str]) -> PlacedCall:
        self.placed.append((phone, purpose, variables))
        log(logger, "mock outbound call", phone=mask_phone(phone), purpose=purpose)
        return PlacedCall(attempt_id=f"mock_{uuid.uuid4().hex[:10]}")


LANGUAGE_NAMES = {"kn": "Kannada", "hi": "Hindi", "en": "English"}


def build_body(settings: Settings, phone: str, variables: dict[str, str]) -> dict[str, Any]:
    language = LANGUAGE_NAMES.get(variables.get("language", ""), "Kannada")
    body: dict[str, Any] = {
        "app_config": {
            "app_id": settings.sarvam_agent_id,
            "app_version": settings.sarvam_agent_version,
            "connection_config": {
                "connection_id": settings.sarvam_connection_id,
                "agent_phone_number": settings.sarvam_from_number,
            },
            "agent_variables": variables,
            "app_overrides": {"initial_language_name": language},
        },
        "user_config": {"user_phone_number": phone},
    }
    if settings.public_base_url:
        body["webhook_config"] = {
            "url": f"{settings.public_base_url.rstrip('/')}/hooks/sarvam-webhook",
            "metadata": {
                "token": settings.tool_shared_secret,
                "mother_id": variables.get("mother_id", ""),
                "call_purpose": variables.get("call_purpose", ""),
            },
        }
    return body


class SarvamCallPlacer:
    def __init__(self, settings: Settings) -> None:
        self._s = settings

    def _url(self) -> str:
        s = self._s
        required = {
            "SARVAM_AGENTS_API_KEY": s.sarvam_agents_api_key or s.sarvam_api_key,
            "SARVAM_ORG_ID": s.sarvam_org_id,
            "SARVAM_WORKSPACE_ID": s.sarvam_workspace_id,
            "SARVAM_AGENT_ID": s.sarvam_agent_id,
            "SARVAM_CONNECTION_ID": s.sarvam_connection_id,
            "SARVAM_FROM_NUMBER": s.sarvam_from_number,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise IntegrationNotConfigured(f"outbound calls need: {', '.join(missing)}")
        return self._s.sarvam_outbound_url.format(
            org_id=self._s.sarvam_org_id,
            workspace_id=self._s.sarvam_workspace_id,
            agent_id=self._s.sarvam_agent_id,
        )

    async def place_call(self, phone: str, purpose: str, variables: dict[str, str]) -> PlacedCall:
        url = self._url()
        body = build_body(self._s, phone, variables)
        key = self._s.sarvam_agents_api_key or self._s.sarvam_api_key
        headers = {"X-API-Key": key, "Content-Type": "application/json"}
        last: Exception | None = None
        for attempt in range(self._s.outbound_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self._s.outbound_timeout_s) as client:
                    resp = await client.post(url, json=body, headers=headers)
                resp.raise_for_status()
                data = resp.json() if resp.content else {}
                attempt_id = str(data.get("attempt_id") or f"sarvam_{uuid.uuid4().hex[:10]}")
                log(logger, "outbound call placed", phone=mask_phone(phone), purpose=purpose)
                return PlacedCall(attempt_id)
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                reason = mask_text(exc.response.text[:300])
                last = IntegrationNotConfigured(f"outbound call failed: HTTP {status}: {reason}")
                log(logger, "outbound call failed", logging.WARNING, attempt=attempt, status=status, reason=reason)
                if 400 <= status < 500 and status not in (408, 429):
                    break  # our request is wrong (key, ids, body): retrying cannot help
                await asyncio.sleep(0.5 * (attempt + 1))
            except (httpx.HTTPError, ValueError) as exc:
                last = exc
                log(logger, "outbound call failed", logging.WARNING, attempt=attempt, error=type(exc).__name__)
                await asyncio.sleep(0.5 * (attempt + 1))
        if isinstance(last, IntegrationNotConfigured):
            raise last
        raise IntegrationNotConfigured(f"outbound call failed: {last}")

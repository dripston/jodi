"""Real Sarvam clients against httpx.MockTransport (no network) + the webhook adapter."""

from __future__ import annotations

import json

import httpx
import pytest

from app.core.config import Settings
from app.core.errors import IntegrationNotConfigured
from app.integrations import sarvam_calls, sarvam_llm
from tests.conftest import AUTH


def _patch_httpx(monkeypatch, handler):
    real = httpx.AsyncClient

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(handler)
        return real(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", factory)


SETTINGS = Settings(
    sarvam_api_key="k", sarvam_org_id="org1", sarvam_workspace_id="ws1", sarvam_agent_id="app1",
    sarvam_connection_id="conn1", sarvam_from_number="+918000000001", public_base_url="https://x.ngrok.app",
    tool_shared_secret="test-secret",
)  # fmt: skip


async def test_outbound_body_and_route(monkeypatch):
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"], seen["key"], seen["body"] = (
            str(request.url),
            request.headers["X-API-Key"],
            json.loads(request.content),
        )
        return httpx.Response(200, json={"attempt_id": "att_123"})

    _patch_httpx(monkeypatch, handler)
    placed = await sarvam_calls.SarvamCallPlacer(SETTINGS).place_call(
        "+919800000001", "checkin", {"call_direction": "outbound", "mother_id": "m_001", "language": "hi"}
    )
    assert placed.attempt_id == "att_123"
    assert seen["url"] == "https://apps.sarvam.ai/api/outbounds/v1/orgs/org1/workspaces/ws1/outbounds"
    body = seen["body"]
    assert body["app_config"]["app_id"] == "app1" and body["app_config"]["app_version"] == 1
    assert body["app_config"]["connection_config"] == {"connection_id": "conn1", "agent_phone_number": "+918000000001"}
    assert body["app_config"]["app_overrides"]["initial_language_name"] == "Hindi"
    assert body["user_config"] == {"user_phone_number": "+919800000001"}
    assert body["webhook_config"]["url"] == "https://x.ngrok.app/hooks/sarvam-webhook"
    assert body["webhook_config"]["metadata"]["token"] == "test-secret"


async def test_outbound_requires_config():
    with pytest.raises(IntegrationNotConfigured, match="SARVAM_CONNECTION_ID"):
        await sarvam_calls.SarvamCallPlacer(Settings(sarvam_api_key="k")).place_call("+91", "checkin", {})


async def test_outbound_retries_then_fails(monkeypatch):
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(500)

    _patch_httpx(monkeypatch, handler)
    s = SETTINGS.model_copy(update={"outbound_retries": 2})
    with pytest.raises(IntegrationNotConfigured):
        await sarvam_calls.SarvamCallPlacer(s).place_call("+91", "checkin", {})
    assert len(calls) == 3


async def test_outbound_4xx_fails_fast_with_reason(monkeypatch):
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(401, json={"error": "invalid api key for +919800000002"})

    _patch_httpx(monkeypatch, handler)
    s = SETTINGS.model_copy(update={"outbound_retries": 2})
    with pytest.raises(IntegrationNotConfigured) as e:
        await sarvam_calls.SarvamCallPlacer(s).place_call("+919800000002", "family_alert", {})
    assert len(calls) == 1  # a rejected request is not retried
    assert "HTTP 401" in e.value.message and "invalid api key" in e.value.message
    assert "9800000002" not in e.value.message  # phone masked


async def test_llm_request_is_strict_structured_output(monkeypatch):
    seen = {}
    content = {"facts": [], "dismissal_detected": False, "needs_clarification": []}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["headers"], seen["body"] = request.headers, json.loads(request.content)
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(content)}}]})

    _patch_httpx(monkeypatch, handler)
    out = await sarvam_llm.SarvamExtractor(SETTINGS).extract("User: hi", "ctx")
    assert out == content
    b = seen["body"]
    assert seen["headers"]["api-subscription-key"] == "k" and b["model"] == "sarvam-105b"
    assert b["reasoning_effort"] is None and b["response_format"]["type"] == "json_schema"
    assert b["response_format"]["json_schema"]["strict"] is True
    assert b["response_format"]["json_schema"]["schema"] == sarvam_llm.EXTRACTION_SCHEMA
    system = b["messages"][0]["content"]
    assert "pad_soaked_within_hour" in system and "naalku batte" in system  # codes + live lexicon injected


async def test_llm_failure_raises_extraction_error(monkeypatch):
    _patch_httpx(monkeypatch, lambda r: httpx.Response(200, json={"choices": [{"message": {"content": "not json"}}]}))
    with pytest.raises(sarvam_llm.ExtractionError):
        await sarvam_llm.SarvamExtractor(SETTINGS).extract("User: hi", "ctx")


# ------------------------------------------------------------------- webhook
def test_webhook_rejects_without_token(client):
    assert client.post("/hooks/sarvam-webhook", json={"attempt_id": "x", "status": "connected"}).status_code == 401


def test_webhook_no_answer_triggers_missed_flow(client):
    placed = client.post("/api/calls", json={"mother_id": "m_003", "purpose": "checkin"}).json()
    r = client.post("/hooks/sarvam-webhook", json={
        "attempt_id": placed["interaction_id"], "status": "no_answer", "interaction_id": None,
        "duration": None, "final_agent_variables": None, "interaction_transcript": None,
        "webhook_config": {"url": "u", "metadata": {"token": "test-secret"}}})  # fmt: skip
    assert r.status_code == 200
    call = client.get("/api/mothers/m_003/calls").json()[0]
    assert call["answered"] is False and call["outcome"] == "no_answer"


def test_webhook_connected_binds_interaction_and_assesses(client):
    placed = client.post("/api/calls", json={"mother_id": "m_001", "purpose": "checkin"}).json()
    payload = {
        "attempt_id": placed["interaction_id"], "status": "connected", "interaction_id": "int_from_webhook",
        "duration": 95, "final_agent_variables": {"call_outcome": "red_flag"},
        "interaction_transcript": [{"role": "agent", "en_text": "Any fits?"},
                                   {"role": "user", "en_text": "ondu ghante alli batte poora odde aaytu"}],
    }  # fmt: skip
    assert client.post("/hooks/sarvam-webhook?token=test-secret", json=payload).status_code == 200
    detail = client.get("/api/calls/int_from_webhook").json()
    assert detail["call"]["outcome"] == "red_flag" and detail["rule_ids"] == ["M-BLEED-01"]
    # the on-end hook for the same interaction afterwards is a no-op (idempotent)
    r = client.post("/hooks/on-end", headers=AUTH, json={"phone": "", "interaction_id": "int_from_webhook",
                                                         "transcript": "x", "answered": True})  # fmt: skip
    assert r.status_code == 200

"""Discharge-slip reading via Sarvam Document AI Extract — Protocol + real (sarvamai SDK) + mock.

SDK calls used (sarvamai 0.1.45): client.doc_ai.extract(file=[...], schema=<json str>,
output_format="json") → job_id; client.doc_ai.get_status(job_id) (terminal: completed,
partially_completed, failed, rejected); client.doc_ai.get_results(job_id, format="json")
→ result + annotations (each leaf has confidence).
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.core.config import Settings
from app.core.errors import IntegrationNotConfigured
from app.core.logging import log

logger = logging.getLogger(__name__)

TERMINAL_OK = {"completed", "partially_completed"}
TERMINAL_FAIL = {"failed", "rejected"}

SLIP_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "delivery_date": {"type": "string", "description": "Date of delivery, as YYYY-MM-DD"},
        "delivery_type": {"type": "string", "enum": ["normal", "c_section", "assisted"],
                          "description": "Mode of delivery: normal vaginal, caesarean section (c_section), or assisted (forceps/vacuum)"},
        "complications": {"type": "array", "items": {"type": "string", "description": "complication"},
                          "description": "Pregnancy/delivery complications in snake_case English, e.g. high_bp_in_pregnancy"},
        "baby_birth_weight_grams": {"type": "integer", "description": "Baby birth weight in grams"},
        "gestation_weeks": {"type": "integer", "description": "Gestational age at birth in completed weeks"},
        "medicines": {"type": "array", "description": "Discharge medicines for the mother",
                      "items": {"type": "object", "description": "one medicine",
                                "properties": {"name": {"type": "string", "description": "Medicine name"},
                                               "dose": {"type": "string", "description": "Dose, e.g. 100 mg"},
                                               "frequency": {"type": "string", "description": "e.g. twice daily"}}}},
    },
}  # fmt: skip


@dataclass
class DocJobStatus:
    status: str  # pending | done | failed
    fields: dict[str, Any] | None = None
    error: str | None = None
    confidence: dict[str, float] = field(default_factory=dict)


class DocReader(Protocol):
    async def submit(self, filename: str, content: bytes, content_type: str) -> str: ...

    async def poll(self, provider_job_id: str) -> DocJobStatus: ...


MOCK_FIELDS: dict[str, Any] = {
    "delivery_date": None,  # filled relative to today by the service (seeded mother's date)
    "delivery_type": "c_section",
    "complications": ["high_bp_in_pregnancy"],
    "baby_birth_weight_grams": 2600,
    "gestation_weeks": 38,
    "medicines": [{"name": "Labetalol", "dose": "100 mg", "frequency": "twice daily"}],
    "confidence": {"delivery_date": 0.93, "delivery_type": 0.9, "baby_birth_weight_grams": 0.71,
                   "gestation_weeks": 0.8, "medicines": 0.85, "complications": 0.82},
}  # fmt: skip


class MockDocReader:
    async def submit(self, filename: str, content: bytes, content_type: str) -> str:
        return f"mock_doc_{abs(hash((filename, len(content)))) % 10**8}"

    async def poll(self, provider_job_id: str) -> DocJobStatus:
        fields = {k: v for k, v in MOCK_FIELDS.items() if k != "confidence"}
        return DocJobStatus("done", fields, confidence=dict(MOCK_FIELDS["confidence"]))


def _flatten_conf(annotations: dict[str, Any]) -> dict[str, float]:
    out: dict[str, float] = {}
    for key, val in annotations.items():
        if isinstance(val, dict) and "confidence" in val:
            out[key] = float(val["confidence"])
        elif isinstance(val, list):
            confs = [float(v["confidence"]) for v in val if isinstance(v, dict) and "confidence" in v]
            if confs:
                out[key] = min(confs)
    return out


class SarvamDocReader:
    def __init__(self, settings: Settings) -> None:
        self._s = settings

    def _client(self) -> Any:
        if not self._s.sarvam_api_key:
            raise IntegrationNotConfigured("SARVAM_API_KEY not set")
        from sarvamai import SarvamAI

        return SarvamAI(api_subscription_key=self._s.sarvam_api_key)

    async def submit(self, filename: str, content: bytes, content_type: str) -> str:
        client = self._client()

        def _run() -> str:
            job = client.doc_ai.extract(
                file=[(filename, content, content_type)],
                schema=json.dumps(SLIP_SCHEMA),
                output_format="json",
            )
            return str(job.job_id)

        job_id = await asyncio.to_thread(_run)
        log(logger, "docai job submitted", job_id=job_id)
        return job_id

    async def poll(self, provider_job_id: str) -> DocJobStatus:
        client = self._client()
        status = await asyncio.to_thread(client.doc_ai.get_status, provider_job_id)
        state = str(status.status)
        if state in TERMINAL_FAIL:
            return DocJobStatus("failed", error=state)
        if state not in TERMINAL_OK:
            return DocJobStatus("pending")
        res = await asyncio.to_thread(client.doc_ai.get_results, provider_job_id, format="json")
        result = dict(getattr(res, "result", {}) or {})
        conf = _flatten_conf(dict(getattr(res, "annotations", {}) or {}))
        return DocJobStatus("done", result, confidence=conf)

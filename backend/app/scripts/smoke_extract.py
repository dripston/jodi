"""Live smoke test for extraction: python -m app.scripts.smoke_extract "<transcript>"

Uses the real Sarvam-105B extractor unless SARVAM_MOCK=true. Prints facts, rules and timing.
"""

from __future__ import annotations

import asyncio
import json
import sys
import time

from app.domain import rules, safety_net
from app.domain.facts import validate_facts
from app.integrations.registry import get_integrations


async def main(transcript: str) -> None:
    started = time.perf_counter()
    raw = await get_integrations().extractor.extract(transcript, "Smoke test; day 5 after delivery.")
    ms = round((time.perf_counter() - started) * 1000)
    v = validate_facts(raw.get("facts", []))
    net = safety_net.check(transcript)
    a = rules.assess(
        rules.AssessmentInput(
            tuple(v.facts),
            rules.Profile(day_since_delivery=5, baby_age_hours=120),
            dismissal_detected=bool(raw.get("dismissal_detected")),
            safety_net_subject=net.subject if net.fired else None,  # type: ignore[arg-type]
        )
    )
    print(json.dumps(raw, ensure_ascii=False, indent=2))
    print(
        f"\nextraction: {ms} ms | dropped: {[d.get('code') for d in v.dropped]} | unclear: {[f.code for f in v.unclear]}"
    )
    print(f"rules: mother={a.mother_level} baby={a.baby_level} rule_ids={a.rule_ids}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit('usage: python -m app.scripts.smoke_extract "<transcript>"')
    asyncio.run(main(sys.argv[1]))

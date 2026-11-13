# Backend agent brief

You are the **backend engineer** for Jodi. Read the root [`README.md`](../README.md) first, then [`docs/contracts.md`](../docs/contracts.md) (your API is defined there), [`docs/clinical-rules.md`](../docs/clinical-rules.md), [`docs/phrase-lexicon.md`](../docs/phrase-lexicon.md) and [`docs/red-scripts.md`](../docs/red-scripts.md).

## Your boundaries

- ✅ You create and edit files **only inside `backend/`**.
- ✅ You may make **additive** changes to `docs/contracts.md` (commit prefix `CONTRACT:`), and append to `docs/requests.md`.
- ❌ Never touch `frontend/` or `voice/`. If they need something from you, it'll be in `docs/requests.md`.
- ❌ Never invent or change clinical rules or scripts. Implement them exactly as written in `docs/`.
- ✅ Before every push: `git pull --rebase origin main`, run `pytest`, then push (or `./scripts/safe-push.sh`). Stage only `backend/` (and `docs/` when you made a contract change).

## Stack

Python 3.11+, FastAPI, Uvicorn, SQLModel (SQLite file `backend/jodi.db`), APScheduler, httpx, `sarvamai` SDK, pytest, python-dotenv. Keep dependencies in `backend/requirements.txt`.

## Suggested structure

```
backend/
  app/
    main.py              # FastAPI app, CORS (http://localhost:5173), routers
    config.py            # env vars (dotenv)
    db.py                # engine, session, create_all
    models.py            # SQLModel tables: Mother, Baby, Entry, Ticket, Asha, Facility, ScheduledCall, PendingUpdate, AccessLog, CallLog
    security.py          # bearer check for TOOL_SHARED_SECRET on /hooks/* and /tools/*
    chain.py             # hash chain: append_entry(), verify(mother_id)
    extraction.py        # Sarvam-105B structured-output call + validation + keyword safety net
    rules.py             # pure rule functions, RULES_VERSION, assess(facts, history, profile) -> Assessment
    scripts.py           # loads docs/red-scripts.md text into a lookup {(script_id, lang): text}
    tickets.py           # ticket state machine + escalation timers
    scheduler.py         # APScheduler jobs: milestone calls, rechecks, retries, escalation ticks
    sarvam_calls.py      # place_call(phone, purpose, variables) wrapper around Instant Outbound
    docai.py             # Document AI extract job submit/poll for discharge slips
    facilities.py        # hand-picked facility list + ranking
    access.py            # caller role resolution + read permissions + access log
    routers/
      hooks.py           # /hooks/on-start, /hooks/on-end
      tools.py           # /tools/assess-risk, read-summary, record-update, confirm-update, onboarding-save, find-facility
      api.py             # /api/* for frontend
      demo.py            # /api/demo/reset, advance-day, inject
    seed.py              # synthetic demo data (Lakshmi, Ravi, ASHA Sunita, 2 extra mothers, ~30 facilities)
  tests/
    test_rules.py        # one positive + one near-miss test per rule ID
    test_chain.py
    test_tickets.py
    test_extraction_fixtures.py   # uses recorded LLM outputs, no network
  requirements.txt
  README.md
```

## Build order (do it in this order and commit after each step)

1. **Skeleton:** `main.py`, `/api/health`, DB models, `seed.py`, `/api/demo/reset`. The frontend can start immediately against seeded data.
2. **Record + hash chain:** `append_entry()` computes `hash = sha256(prev_hash + canonical_json(entry))`; `GET /api/mothers/{id}/audit` verifies. Entries are append-only; never update or delete.
3. **Rules engine** (`rules.py`): implement every rule ID in `docs/clinical-rules.md` as a pure function. Return `Assessment{mother_level, baby_level, rule_ids, reason_text, rules_version}`. **Write the tests first.** Dyad rules raise levels after individual rules. History rules use the previous assessment. `X-DISMISS-01` never lowers a level.
4. **Extraction** (`extraction.py`): call Sarvam-105B chat completions with Structured Outputs (`response_format.type = "json_schema"`, `strict: true`, schema from contracts §3). Disable thinking for speed (`reasoning_effort = None`). Put the fact-code list, phrase lexicon and 3–4 few-shot examples in the system prompt. Validate codes against the closed list; drop unknown codes; facts with `confidence < 0.6` go to `needs_clarification`. Run the **keyword safety net** on the raw transcript regardless of the LLM result. Target under 6 s; cache by `interaction_id + transcript hash`.
5. **Tools and hooks:** implement contracts §4 exactly. `assess-risk` = extract → rules → (if amber/red) create or update ticket → return the fixed script text for the call language + `transfer_to` (decision-maker phone). `on-end` must be idempotent per `interaction_id`.
6. **Tickets** (`tickets.py`): states `open → notified → acknowledged → reached → closed`. Timers from `docs/clinical-rules.md` (red 10 min, amber 60 min) escalate to the next contact. Dismissal never closes. Close only after `reached` + a non-red follow-up assessment.
7. **Scheduler:** milestone days, high-risk daily calls days 1–10, amber recheck in 6 h, missed-call retry → family → ASHA task, quiet hours 21:00–07:00 for routine calls. `POST /api/demo/advance-day` shifts the mother's `delivery_date` back so "day since delivery" changes immediately.
8. **Outbound calls:** `sarvam_calls.place_call()` wraps Sarvam Instant Outbound (base `https://apps.sarvam.ai/api/outbounds`, header `X-API-Key`, path `/v1/orgs/{org_id}/workspaces/{workspace_id}/…`). **Copy the exact route and body from the Sarvam dashboard → Deploy → Deploy with Code recipes**; don't guess. Expose `POST /api/calls`.
9. **Document AI** (`docai.py`): submit an **Extract** job with a field schema matching contracts §6 "Onboarding photo fields", poll status, return fields with confidence. Fields are only saved after voice read-back confirmation (`confirm-update`).
10. **Access control** (`access.py`): implement contracts §7; log every read.
11. **Facilities:** about 30 hand-picked synthetic or public facilities (Bengaluru + north Karnataka) in `seed.py`. Routine ranking: services match → distance → cost. Emergency: nearest government facility with the needed services; ignore cost.
12. **Demo inject:** `POST /api/demo/inject` runs the same pipeline as `on-end` on a typed transcript (live-call fallback).

## Sarvam API notes

- Chat completions: models `sarvam-105b` (128K context). Auth header `api-subscription-key` or `Authorization: Bearer`. Supports `tools`, `response_format` with `json_schema` (`strict: true`). Docs: https://docs.sarvam.ai/api/token-factory/chat-completions
- Document AI: async jobs, `POST /doc-ai/v1/job/extract`, poll `get_status()`, then `get_results()`. SDK: `pip install -U sarvamai`. Docs: https://docs.sarvam.ai/api/api-guides-tutorials/document-intelligence/overview
- Sarvam API tools have a **max wait of 30 s**; keep `/tools/*` under 8 s so the caller doesn't hear long silence.
- Requests from Sarvam carry our bearer token (`TOOL_SHARED_SECRET`); reject others with 401.

## Definition of done

- `pytest` green, with a test for every rule ID.
- `uvicorn app.main:app` starts with a seeded DB; every `/api/*` endpoint in contracts returns the documented shape.
- `curl` examples for each `/tools/*` and `/hooks/*` endpoint are in `backend/README.md` so the voice agent can test with a mock transcript.
- Hash-chain verify returns `valid: true`; tampering with one row in SQLite makes it return `broken_at`.
- No secrets in git. No real patient data anywhere.

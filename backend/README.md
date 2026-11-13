# backend/

Owned by the **backend agent**. Brief: [`../agents/backend.md`](../agents/backend.md). API contract: [`../docs/contracts.md`](../docs/contracts.md).

FastAPI service that stores the mother–baby record, turns call transcripts into facts, applies the fixed clinical rules from [`docs/clinical-rules.md`](../docs/clinical-rules.md), runs escalation tickets and schedules calls through Sarvam.

**AI understands, rules decide, humans confirm.** The LLM only extracts facts. Every amber/red decision comes from `app/domain/rules.py`, and every emergency sentence is read verbatim from [`docs/red-scripts.md`](../docs/red-scripts.md).

## Run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000              # seeds the DB on first start
```

Fully offline (frontend work, demos without Sarvam): `SARVAM_MOCK=true uvicorn app.main:app --port 8000`.

Checks (run before every push):

```bash
ruff check . && ruff format --check . && pytest -q
```

Live extraction smoke test (needs `SARVAM_API_KEY`): `python -m app.scripts.smoke_extract "naalku batte since morning, tale bhaara"`.

### Environment

Read from the repo-root `.env` (or `backend/.env`). Names are in [`../.env.example`](../.env.example).

| Variable | Use |
|---|---|
| `SARVAM_API_KEY` | Sarvam-105B extraction, Document AI, Instant Outbound |
| `SARVAM_ORG_ID`, `SARVAM_WORKSPACE_ID`, `SARVAM_AGENT_ID` (= `app_id`), `SARVAM_AGENT_VERSION` (default 1), `SARVAM_CONNECTION_ID`, `SARVAM_FROM_NUMBER` | Instant Outbound calls |
| `SARVAM_OUTBOUND_URL` | Defaults to the documented route `https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds`. Compare it and `build_body()` (`app/integrations/sarvam_calls.py`) with the dashboard → Deploy with Code recipe before the first live call. |
| `PUBLIC_BASE_URL` | ngrok URL; sent as `webhook_config.url` (`/hooks/sarvam-webhook`) on every outbound call |
| `TOOL_SHARED_SECRET` | bearer token on every `/hooks/*` and `/tools/*` request (requests without it get 401) |
| `SARVAM_MOCK` | `true` = deterministic offline mocks for LLM, Document AI and calls |
| `DEMO_MODE` | `true` mounts `/api/demo/*` |
| `DATABASE_URL` | default `sqlite:///backend/jodi.db` |
| `SCHEDULER_ENABLED`, `SEED_ON_STARTUP` | default `true` |

## Layout

```
app/
  core/          settings, JSON logging (phones masked), errors, bearer check, IST time helpers
  db/            SQLModel tables + session
  domain/        PURE logic (no DB/network/clock): rules, safety net, hash chain, escalation,
                 scheduling, access, scripts, facilities, labels, transcript + update parsing
  integrations/  sarvam_llm / sarvam_docai / sarvam_calls — Protocol + real + mock each
  repositories/  DB access only
  services/      orchestration (assessment pipeline, tickets, calls, onboarding, updates, stats, demo)
  api/           thin routers: hooks, tools, dashboard, actions, demo
  jobs/          APScheduler: due-call runner + escalation tick (every 30 s)
  seed/          synthetic demo data (Lakshmi, Kavya, Priya; ASHAs Sunita, Meena; 30 facilities)
  prompts/       extraction system prompt (fact codes + live phrase lexicon injected at startup)
tests/           domain (one positive + one near-miss per rule ID), contract and end-to-end flow tests
```

## Behaviour notes for the voice and frontend owners

- **Transcripts:** only the caller's turns are used for facts and the safety net. `@CallTranscript` may be plain text, `User:/Agent:` lines or a JSON list of `{role, content}`. Jodi's own questions ("any fits?") never trigger anything.
- **assess-risk scripts:** red uses `RED-FITS` (or the baby version) > `RED-BLEED` > `RED-MOTHER` > `RED-BABY`; amber returns `AMBER-MOTHER` and/or `AMBER-BABY`. A *new* dismissal while a flag is active returns `DISMISSAL-RESPONSE` in `say_verbatim`, at the flag's level, never lower. On a `family_alert` call the first assess-risk returns `FAMILY-ALERT`, and a "yes"/"haudu" from the family acknowledges the ticket.
- **Language:** only English master texts exist in `docs/red-scripts.md` today, so kn/hi calls get the English text (logged as a fallback) until native-speaker versions are added as `> **kn:** "…"` lines.
- **Low confidence:** facts under 0.6 are not saved; `clarify_question` asks again. If extraction fails, the safety net still runs and `clarify_question = "Could you tell me that again?"`.
- **Transfer:** `transfer_to` is set only for red during a live call (decision-maker first, never the caller themselves, never on `family_alert` calls).
- **Tickets:** one active ticket per mother; red escalates after 10 min and amber after 60 min without ack (next family phone → ASHA → ANM placeholder). A confirmed ASHA-measured or doctor-verified update counts as "reached". The ticket closes only on a later non-red assessment.
- **Outbound calls** return Sarvam's attempt id; the real `@InteractionID` is bound on `/hooks/on-start` (by callee phone within 15 min). `agent_variables` carry `call_direction=outbound`, `call_purpose`, `callee_phone`, `mother_id`, `language`.
- **Status / post-call webhook:** Sarvam webhooks can't send our bearer header. Outbound calls set `webhook_config.metadata.token`, which Sarvam echoes back. For the inbound deployment webhook, use `/hooks/sarvam-webhook?token=<TOOL_SHARED_SECRET>`. The adapter follows the documented Instant Outbound payload (`attempt_id`, `status` = `connected`/`no_answer`/`busy`/`failed`, `interaction_id`, `duration`, `final_agent_variables`, `interaction_transcript[{role, en_text}]`). It binds the attempt to the interaction and runs the same idempotent on-end pipeline; `no_answer`/`busy`/`failed` start the missed-call chain.
- `/hooks/on-end` accepts `duration_seconds` as a number or `"02:22"`, and `call_outcome` either inside `variables` or flat.

## curl examples (hooks and tools)

Set `B=http://localhost:8000` (or the ngrok URL) and `S=$TOOL_SHARED_SECRET`. Run `curl -X POST $B/api/demo/reset` first.

```bash
# 4.1 on-start
curl -s -X POST $B/hooks/on-start -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"phone":"+919800000001","interaction_id":"int_t1","direction":"inbound"}'

# 4.2 assess-risk — amber (demo check-in) and red (pad soaked within an hour)
curl -s -X POST $B/tools/assess-risk -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"phone":"+919800000001","interaction_id":"int_t1","transcript":"User: naalku batte since morning, tale bhaara. magu haalu kammi kudiyuttide"}'
curl -s -X POST $B/tools/assess-risk -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"phone":"+919800000001","interaction_id":"int_t2","transcript":"User: ondu ghante alli batte poora odde aaytu"}'

# dismissal after the flag (same interaction) → DISMISSAL-RESPONSE
curl -s -X POST $B/tools/assess-risk -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"phone":"+919800000001","interaction_id":"int_t2","transcript":"User: ondu ghante alli batte poora odde aaytu\nUser: delivery aadmele heege, normal"}'

# 4.3 read-summary (mother's phone / unknown phone)
curl -s -X POST $B/tools/read-summary -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"caller_phone":"+919800000001","interaction_id":"int_t3"}'
curl -s -X POST $B/tools/read-summary -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"caller_phone":"+919999999999","interaction_id":"int_t4"}'

# 4.4 record-update (ASHA) → 4.5 confirm-update
curl -s -X POST $B/tools/record-update -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"caller_phone":"+919800000009","interaction_id":"int_t5","transcript":"User: Lakshmi nodide, BP 150 over 100, magu 2.8 kg","about_mother_phone":null}'
curl -s -X POST $B/tools/confirm-update -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"pending_id":"<pending_id from above>","confirmed":true}'

# doctor on the mother's phone
curl -s -X POST $B/tools/record-update -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"caller_phone":"+919800000001","interaction_id":"int_t6","transcript":"User: This is Doctor Rao. Started iron and labetalol 200."}'

# 4.6 onboarding-save (after POST /api/onboarding/photo) → confirm with 4.5
curl -s -X POST $B/tools/onboarding-save -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"phone":"+919800000001","interaction_id":"int_t7","transcript":"User: C-section on 12 November, baby 2.6 kg, labetalol 100 mg twice daily. Husband Ravi 9800000002"}'

# 4.7 find-facility
curl -s -X POST $B/tools/find-facility -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"mother_phone":"+919800000001","need":"emergency","interaction_id":"int_t8"}'

# 4.8 on-end (idempotent per interaction_id)
curl -s -X POST $B/hooks/on-end -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"phone":"+919800000001","interaction_id":"int_t1","transcript":"User: naalku batte since morning","duration_seconds":142,"variables":{"call_outcome":"completed"},"answered":true}'
```

Frontend/demo helpers:

```bash
curl -s -X POST $B/api/demo/reset
curl -s -X POST $B/api/demo/advance-day -H 'Content-Type: application/json' -d '{"mother_id":"m_001","days":4}'
curl -s -X POST $B/api/demo/inject -H 'Content-Type: application/json' \
  -d '{"mother_id":"m_001","caller_phone":"+919800000001","transcript":"User: ondu ghante alli batte poora odde aaytu"}'
curl -s -F file=@slip.jpg -F phone=+919800000001 $B/api/onboarding/photo
curl -s $B/api/mothers/m_001/audit
```

## Known gaps

- Live Sarvam paths (LLM, Document AI, Instant Outbound) are implemented but **not yet exercised against the real API**. Outbound needs `SARVAM_OUTBOUND_URL` and a body check against the dashboard recipe.
- kn/hi versions of the fixed scripts don't exist yet, so English is returned.
- Medicine names in record updates use a fixed list (`app/domain/updates.py`); unknown medicines aren't captured.

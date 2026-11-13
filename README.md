# Jodi

**A 42-day voice care companion that follows a mother and her newborn, not the hospital.**

> *Do zindagiyaan, ek dekhbhal.* ("Two lives, one care.")

This README is the **shared brief for every human and every coding agent** working in this repo. Read it fully before you write any code. Then read your own role file in [`agents/`](agents/).

---

## 1. What we are building (in one minute)

After delivery, Indian mothers are sent home within a day or two. The next six weeks are when mothers and newborns are most at risk, yet nobody is responsible for them between discharge and day 42. Premium hospitals follow up only their own patients, small hospitals say "come back if there's an emergency", and government programmes are periodic (ASHA visits) or one-way (Kilkari).

**Jodi** is an independent service that a family subscribes to (or that NHM/CSR sponsors). It works on **any phone, including keypad phones**, in the family's language (Kannada first, then Hindi and English).

1. **Onboarding call** builds a health record for mother and baby (and optionally reads a photo of the paper discharge slip).
2. **Adaptive voice check-ins:** Jodi calls on clinical milestones *and* when risk rises.
3. **Everyday speech becomes facts:** "four cloths since morning" becomes `pads soaked = 4`.
4. **Fixed clinical rules** (not AI) turn facts into 🟢 green, 🟡 amber or 🔴 red, for mother and baby **as one pair** ("jodi").
5. **Dismissal-proof escalation:** a red/amber flag becomes a ticket that alerts the family decision-maker and the ASHA, and **stays open until a human confirms the mother/baby was reached**. "She's fine" never closes it.
6. **The record updates itself** after every call, ASHA visit and doctor note. Every entry carries a **source label** and is sealed in a **tamper-evident hash chain**.
7. **Her phone is her medical record:** at any doctor, she calls Jodi from her own phone and hands it over; Jodi reads her history aloud and the doctor can add notes.

**Core principle: AI understands, rules decide, humans confirm.** The language model only extracts facts. It never diagnoses. Every red/amber decision comes from a versioned rule in [`docs/clinical-rules.md`](docs/clinical-rules.md).

---

## 2. System overview

```
 Mother / Family / ASHA / Doctor (any phone)
              │  phone calls
              ▼
 ┌─────────────────────────── SARVAM (voice) ────────────────────────────┐
 │ Voice Agent: Saaras (ears) · LLM (conversation) · Bulbul v4 (mouth)    │
 │ on_start hook ─► loads her context   API tools ─► mid-call actions     │
 │ on_end hook  ─► sends transcript     call transfer ─► husband / ASHA   │
 └───────────────┬───────────────────────────────────────┬───────────────┘
                 │ HTTPS (via ngrok during hackathon)     │
                 ▼                                        ▼
 ┌──────────────────────────── BACKEND (FastAPI) ────────────────────────┐
 │ Onboarding · Fact extraction (Sarvam-105B) · Rules engine · Scheduler │
 │ Escalation tickets · Record + hash chain · Access control · Facilities│
 └───────────────────────────────┬───────────────────────────────────────┘
                                 │ REST JSON (polling every 2 s)
                                 ▼
 ┌──────────────────────────── FRONTEND (React) ─────────────────────────┐
 │ Demo board · Mother & baby timeline · ASHA priority list · Onboarding  │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository layout and ownership

| Folder | Owner | What lives here |
|---|---|---|
| `backend/` | **Backend agent** | FastAPI app, database, extraction, rules, scheduler, tickets, hash chain, Sarvam API calls (LLM, Document AI, outbound calls) |
| `frontend/` | **Frontend agent** | React + Vite + TypeScript UI: demo board, timeline, ASHA list, onboarding upload |
| `voice/` | **Voice agent** | Sarvam Voice Agent system prompt, mode prompts, tool definitions (JSON), test scenarios, setup notes |
| `docs/` | **Shared, read by all** | Contracts, clinical rules, phrase lexicon, red scripts, demo script, requests board |
| `agents/` | Shared | Role briefs for each coding agent |
| `scripts/` | Shared | Helper scripts (e.g. `safe-push.sh`) |

### Hard ownership rules

1. **You only create, edit or delete files inside your own folder.** The backend agent never touches `frontend/` or `voice/`. The frontend agent never touches `backend/` or `voice/`. The voice agent never touches `backend/` or `frontend/`.
2. **Everyone may read everything.** Read other folders to understand them, never to edit them.
3. **`docs/contracts.md` is the single source of truth** for every API endpoint and JSON shape shared between modules. If you need a contract change:
   - make the smallest possible change in `docs/contracts.md`;
   - use a commit message starting with `CONTRACT:`;
   - never remove or rename an existing field (only add optional fields);
   - add a note in `docs/requests.md` so the other owners see it.
4. **Need something from another module?** Do not build it yourself. Add an entry to [`docs/requests.md`](docs/requests.md) (who, what, why, by when) and mock it on your side until it lands.
5. **Clinical content** (`docs/clinical-rules.md`, `docs/red-scripts.md`, `docs/phrase-lexicon.md`) is edited only by the human content owner. Agents implement it; they do not invent new medical rules.

---

## 4. Git workflow (mandatory for every agent)

We all commit to `main`. Folder ownership prevents most conflicts; the rules below prevent the rest.

1. **Always pull before you push.** Before every push:
   ```bash
   git pull --rebase origin main
   ```
   Then run your module's checks, then push. Or simply use:
   ```bash
   ./scripts/safe-push.sh
   ```
2. **Never force-push. Never rewrite history** (`--force`, `reset --hard` on shared commits, `rebase -i` on pushed commits are forbidden).
3. **Small, frequent commits.** Commit message format:
   ```
   [backend] add rules engine with unit tests
   [frontend] timeline shows source labels
   [voice] check-in prompt v2: ask baby questions first
   CONTRACT: add optional `transfer_to` to assess-risk response
   ```
4. **Stage only your own folder** (`git add backend/`, not `git add .`). Check `git status` before committing.
5. **If a rebase conflict appears in a file you don't own, stop.** Do not resolve it by editing someone else's file. Abort (`git rebase --abort`), post in `docs/requests.md`, and wait for the owner.
6. **Never commit secrets.** API keys live in `.env` (git-ignored). Add new variable names (not values) to `.env.example`.

---

## 5. Tech stack (decided; don't change without a request)

| Layer | Choice |
|---|---|
| Backend | Python 3.11+, FastAPI, Uvicorn, SQLite via SQLModel, APScheduler, `httpx`, `sarvamai` SDK, `pytest` |
| Frontend | React 18 + Vite + TypeScript, Tailwind CSS, plain `fetch` with polling every 2 s |
| Voice | Sarvam Voice Agents (configured in the Sarvam dashboard; prompts and tool configs are versioned in `voice/`) |
| AI models | Sarvam-105B (Structured Outputs, `json_schema` strict) for extraction · Sarvam Document AI (Extract) for discharge slips · Saaras for speech-to-text · **Bulbul v4** for voice (v3 was retired from Voice Agents on 10 Nov 2026) |
| Tunnel | ngrok, so Sarvam can reach the backend on a laptop |
| Ports | Backend `8000`, frontend `5173` |

### Environment variables (see `.env.example`)

```
SARVAM_API_KEY=            # Sarvam API key (server-side only, never in frontend)
SARVAM_ORG_ID=
SARVAM_WORKSPACE_ID=
SARVAM_AGENT_ID=           # voice agent / deployment id from dashboard
SARVAM_FROM_NUMBER=        # Sarvam-rented or BYO telephony number
PUBLIC_BASE_URL=           # ngrok https URL of the backend
TOOL_SHARED_SECRET=        # bearer token Sarvam tools send to our backend
DEMO_MODE=true
VITE_API_BASE=http://localhost:8000
```

---

## 6. Running locally

```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# tunnel (separate terminal) – copy the https URL into PUBLIC_BASE_URL and into Sarvam tool configs
ngrok http 8000

# frontend
cd frontend && npm install && npm run dev
```

---

## 7. The demo we are building toward (about 3 minutes)

Full script in [`docs/demo-script.md`](docs/demo-script.md). The five moments the judges must see:

1. **Onboarding:** photo of a discharge slip, then the record appears, then Jodi reads it back on a real phone call.
2. **Self-updating record:** a live check-in call; the mother says *"naalku batte since morning, tale bhaara"* and the baby "isn't drinking milk". Facts appear on the timeline with source labels.
3. **Red flag:** rules fire; Jodi reads the fixed red script, the husband's phone rings, and a ticket opens. "She's fine" does not close it.
4. **ASHA:** her priority list re-orders; she calls in, gives a BP by voice, and it's saved as *ASHA-measured*. The ticket closes only when she confirms the mother was reached.
5. **Her phone is her record:** a "doctor" takes the mother's phone, Jodi reads her history, the doctor adds a new medicine, and the timeline shows *doctor-verified*. The hash-chain badge stays green.

---

## 8. Safety and ethics rules (apply to every module)

- **Synthetic data only.** Never use real patient names, numbers or records in code, fixtures, tests or demos.
- **No diagnosis.** Jodi never tells anyone what disease they have. It reports danger signs and tells them what to do, using approved scripts.
- **Emergency instructions are fixed text** from `docs/red-scripts.md`, read verbatim. Never generate them with an LLM.
- **Emergency routing never considers price.** Red means "call 108 and go to the nearest capable government hospital".
- **Read back every number and medicine** before saving it.
- **Low confidence means ask again, never guess.**
- **Access:** only the mother's/family's registered phones and her registered ASHA may *hear* her history. Anyone may *add* information; it is labelled with the caller and source.
- **All clinical rules in this repo are drafts** that require review by a qualified clinician before any real-world use.

---

## 9. Where to find things

- [`agents/backend.md`](agents/backend.md): backend agent brief
- [`agents/frontend.md`](agents/frontend.md): frontend agent brief
- [`agents/voice.md`](agents/voice.md): voice agent brief
- [`docs/contracts.md`](docs/contracts.md): APIs and data shapes (source of truth)
- [`docs/clinical-rules.md`](docs/clinical-rules.md): danger-sign rules (draft)
- [`docs/phrase-lexicon.md`](docs/phrase-lexicon.md): everyday phrases to clinical codes
- [`docs/red-scripts.md`](docs/red-scripts.md): fixed emergency scripts
- [`docs/demo-script.md`](docs/demo-script.md): the finale demo, step by step
- [`docs/requests.md`](docs/requests.md): cross-module requests board

### Sarvam documentation (read before building)

- Docs index: https://docs.sarvam.ai/llms.txt
- Voice Agents index: https://docs.sarvam.ai/voice-agents/llms.txt
- Variables: https://docs.sarvam.ai/voice-agents/build/variables-personalization.md
- On-start / on-end hooks: https://docs.sarvam.ai/voice-agents/build/on-start-on-end-hooks.md
- API (HTTPS) tool: https://docs.sarvam.ai/voice-agents/build/tools/https-tool.md
- Inbound calls: https://docs.sarvam.ai/voice-agents/deploy/inbounds.md
- Campaigns: https://docs.sarvam.ai/voice-agents/deploy/campaigns.md
- Voice Agents API intro: https://docs.sarvam.ai/voice-agents/api/introduction.md
- Chat completions (Structured Outputs, tools): https://docs.sarvam.ai/api/token-factory/chat-completions
- Document Intelligence: https://docs.sarvam.ai/api/api-guides-tutorials/document-intelligence/overview

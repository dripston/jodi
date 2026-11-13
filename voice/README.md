# voice/

Owned by the **voice agent**. Brief: [`../agents/voice.md`](../agents/voice.md).

This folder is the versioned copy of everything configured in the Sarvam Voice Agents dashboard. The live agent lives in the dashboard; this folder must always match the version that is deployed. Mention the dashboard agent version in each commit message (e.g. `[voice] v3: check-in asks baby questions first`).

**Current agent version:** v0 (not yet configured in dashboard). See [`agent.md`](agent.md).

## Files

| Path | What it is | Dashboard location |
|---|---|---|
| [`agent.md`](agent.md) | Settings checklist: voice (Bulbul V4), language, variables, hooks, tools, KB, secrets, inbound 24×7, outbound notes, changelog | whole agent |
| [`prompts/system.md`](prompts/system.md) | System prompt: persona, safety rules, language, lexicon, tool usage, playbook selection | Instruction → Instructions |
| [`prompts/onboarding.md`](prompts/onboarding.md) | Onboarding playbook (consent, questions, read-back, correction) | pasted under "Mode playbooks" |
| [`prompts/checkin.md`](prompts/checkin.md) | Check-in playbook (mother then baby, guided baby checks, wrong person) | " |
| [`prompts/inbound.md`](prompts/inbound.md) | Inbound playbook (mother or family calls) | " |
| [`prompts/asha.md`](prompts/asha.md) | ASHA playbook (priority list, visit updates) | " |
| [`prompts/doctor.md`](prompts/doctor.md) | Doctor-on-mother's-phone playbook | " |
| [`prompts/unknown.md`](prompts/unknown.md) | Unknown caller playbook (no history, updates accepted) | " |
| [`prompts/family_alert.md`](prompts/family_alert.md) | Family-alert playbook (decision-maker call, dismissal) | " |
| [`tools/on_start_hook.json`](tools/on_start_hook.json) | on_start hook → `/hooks/on-start` | Tools → API tool (on_start) |
| [`tools/on_end_hook.json`](tools/on_end_hook.json) | on_end hook → `/hooks/on-end` | Tools → API tool (on_end) |
| [`tools/assess_risk.json`](tools/assess_risk.json) | → `/tools/assess-risk` | Tools → API tool |
| [`tools/read_summary.json`](tools/read_summary.json) | → `/tools/read-summary` | Tools → API tool |
| [`tools/record_update.json`](tools/record_update.json) | → `/tools/record-update` | Tools → API tool |
| [`tools/confirm_update.json`](tools/confirm_update.json) | → `/tools/confirm-update` | Tools → API tool |
| [`tools/onboarding_save.json`](tools/onboarding_save.json) | → `/tools/onboarding-save` | Tools → API tool |
| [`tools/find_facility.json`](tools/find_facility.json) | → `/tools/find-facility` | Tools → API tool |
| [`tools/call_transfer.json`](tools/call_transfer.json) | Call forwarding to `transfer_to` (core tool) | Settings → In Call Actions |
| [`tools/language_switch.json`](tools/language_switch.json) | Language switch kn/hi/en (core tool) | Settings → Language personalisation |
| [`tests/README.md`](tests/README.md) | Test index, seed data, suite guardrails, known limits | Tests |
| `tests/01-…md` to `tests/15-…md` | 15 test cases (scenario, expected tools, backend response, rule IDs, judge behaviours) | Tests → Add test |

## Conventions in the JSON tool files

The files are our own record of the dashboard fields. Sarvam has no documented import format for them, so enter them by hand or paste the `curl` into the tool builder's cURL import.

- `@UserIdentifier`, `@InteractionID`, `@CallTranscript`, `@CallLength`: Sarvam call-context variables. Insert them with the `@` picker.
- `@some_variable`: an agent variable from `agent.md` §8. Insert it with `@`.
- `{{PUBLIC_BASE_URL}}`: replace with the current ngrok https URL (it is not a Sarvam variable).
- `{{secrets.TOOL_SHARED_SECRET}}`: our placeholder for the workspace Secret. In the dashboard set Auth = Bearer token and pick the secret through the masked input. **No secret values ever go in this folder.**
- `save_reply_into_variables`: `response field → agent variable`.
- `mock_response` / `mock_response_variants`: canned responses matching `docs/contracts.md` §4, for mocking and tests.
- `filler_before_call`: spoken by the agent because the prompt says so (no dashboard field for it).

## How to sync the dashboard

**voice/ → dashboard (after editing files here):**
1. Open the agent's draft in the Canvas.
2. Instruction: paste `prompts/system.md` and the playbooks in the order given at the top of `system.md`; re-insert variable and tool chips with `@`.
3. Tools: update each tool from its JSON (description, URL, body, auth, response template, max wait, if-it-fails, save-reply mapping). Press **Test** on each.
4. Settings / Variables: walk the checkboxes in `agent.md`.
5. **Commit** the agent, run **Tests → Run all**, fix or document failures.
6. Deploy the committed version (inbound deployment: pause → edit → resume, or create a new one), then place a real phone call.
7. In `agent.md`, bump **Agent version** to the dashboard version number, add a changelog row, and commit with `[voice] vN: …`.

**dashboard → voice/ (if someone changed the dashboard directly, e.g. via Genie):**
1. Open the version in the Canvas and copy the greeting, instructions, tool configs and settings back into these files.
2. Add a changelog row noting the dashboard-first change, then commit.

**Git:** stage only `voice/`; `git pull --rebase origin main` before every push (or `./scripts/safe-push.sh`).

## Safety reminders for anyone editing prompts

- Never write emergency or warning text into the prompt. Red/amber/dismissal/not-allowed texts come from the backend (`say_verbatim`, `summary_text`), from `docs/red-scripts.md`.
- Never add or soften clinical rules. Levels come only from `assess_risk`.
- Kannada and Hindi lines here are drafts until a native speaker checks them.
- Synthetic data only.

# Voice agent brief

You own the **Sarvam Voice Agent**: the voice of Jodi. Read the root [`README.md`](../README.md), then [`docs/contracts.md`](../docs/contracts.md) §4 (hooks and tools you call), [`docs/red-scripts.md`](../docs/red-scripts.md), [`docs/phrase-lexicon.md`](../docs/phrase-lexicon.md) and [`docs/demo-script.md`](../docs/demo-script.md).

## Your boundaries

- ✅ You create and edit files **only inside `voice/`**: prompts, tool configuration JSON, test scenarios and setup notes. The live agent is configured in the **Sarvam dashboard**; `voice/` is the versioned copy of everything you configure there (keep them in sync and note the agent version in each commit).
- ❌ Never touch `backend/` or `frontend/`. Need a backend change? Append to `docs/requests.md`. Use Sarvam's **mock tool** feature until the backend endpoint is live.
- ✅ Before every push: `git pull --rebase origin main`, then push (or `./scripts/safe-push.sh`). Stage only `voice/`.
- ❌ Never put API keys or the tool bearer secret in `voice/`; reference them as Sarvam workspace **Secrets**.

## Sarvam setup checklist

1. Create **one agent** (single-state to start; Sarvam recommends starting single-state). Language: Kannada primary; enable the **language-switch tool** for Hindi/English.
2. Voice: **Bulbul v4** (Bulbul v3 was retired from Voice Agents on 10 Nov 2026). Pick a calm, warm female voice. Speech recognition: Saaras (default for Voice Agents).
3. **Input variables** (filled by the on-start hook): `caller_role`, `call_purpose`, `language`, `mother_name`, `day_since_delivery`, `delivery_type`, `baby_age_days`, `focus_topics`, `last_summary`, `open_ticket`, `asha_patient_list`.
4. **Output variables** (extracted after the call, for analytics only; the backend does its own extraction): `call_outcome` (enum: completed, red_flag, amber_flag, no_answer, wrong_person), `language_used` (string).
5. **On-start hook** → `POST {PUBLIC_BASE_URL}/hooks/on-start` with `phone = @UserIdentifier`, `interaction_id = @InteractionID`. Map response fields into the input variables above.
6. **On-end hook** → `POST {PUBLIC_BASE_URL}/hooks/on-end` with phone, interaction id, transcript, variables.
7. **API tools** (all `POST`, auth = bearer secret from workspace Secrets, max wait 10 s, say a short filler first, e.g. "ondu nimisha…"):
   - `assess_risk`: body `{phone: @UserIdentifier, interaction_id: @InteractionID, transcript: @CallTranscript}`; save reply fields `level`, `say_verbatim`, `transfer_to`, `clarify_question` into variables.
   - `read_summary`: body `{caller_phone: @UserIdentifier, interaction_id: @InteractionID}`.
   - `record_update` and `confirm_update`: for ASHA, doctor and family updates.
   - `onboarding_save`: during onboarding; then `confirm_update`.
   - `find_facility`: `{mother_phone, need, interaction_id}`.
8. **Call transfer tool:** transfer to the number in variable `transfer_to`.
9. **Knowledge base:** upload approved postnatal and newborn care guidance (WHO/MoHFW counselling content only) for everyday questions ("is this crying normal?"). Never answer medical questions outside the knowledge base; say "I'll ask your ASHA to check" instead.
10. **Inbound deployment:** assign the number; set availability to **all days, 00:00–23:59** (the default is 09:00–18:00; confirm 24×7 works). Configure the post-call webhook to `/hooks/on-end`.
11. **Tests:** write the scenarios in `voice/tests/` (see below) and run them in Sarvam **Tests** (simulated calls graded by an AI judge) before every demo.

Store every config you set as JSON or Markdown in `voice/` (`voice/agent.md`, `voice/prompts/*.md`, `voice/tools/*.json`, `voice/tests/*.md`).

## System prompt requirements (write in `voice/prompts/system.md`)

The prompt must make the agent:

- **Identity:** "You are Jodi, a caring postpartum companion calling on behalf of the mother's care plan. You are not a doctor. You never diagnose and never name a disease."
- **Language:** speak `{{language}}` (Kannada by default) in simple, warm, short sentences; mirror code-mixing; switch language if the speaker does.
- **Modes by `{{call_purpose}}`:**
  - `onboarding`: collect, one question at a time: delivery date, delivery type (normal / C-section), complications (BP, bleeding, sugar), baby's weight and whether born early, current medicines, preferred language, decision-maker's name/relation/number. Then call `onboarding_save`, read back `readback_text` exactly, get a clear yes, then call `confirm_update`. Record spoken consent: "Do you agree that Jodi keeps your and your baby's health record and shares it only with your family and ASHA?"
  - `checkin`: greet by name, mention the day ("day {{day_since_delivery}}"), ask about **mother then baby** following `{{focus_topics}}`. Ask **one question at a time**. For the baby, guide observation: count breaths for one minute together, check palms and soles for yellow, feel the tummy and feet for hot/cold, ask how many feeds and wet nappies. After every symptom answer, call `assess_risk`.
  - `inbound`: ask "Is this about you or the baby? What's happening?" and call `assess_risk` early.
  - `asha`: read `{{asha_patient_list}}`; take visit updates; call `record_update`, read back, `confirm_update`.
  - `doctor` (the mother's phone handed to a doctor): call `read_summary`, read it, take notes via `record_update` (say "doctor" and the doctor's name), read back, confirm.
  - Unknown caller: you may take information (`record_update`) but must not share any history (read the NOT-ALLOWED script).
- **Safety (non-negotiable):**
  - When `assess_risk` returns `level = red` or `amber`, read `say_verbatim` **word for word**; do not paraphrase, shorten or add advice. For red, then use call transfer to `transfer_to`.
  - If `clarify_question` is non-null, ask exactly that question, then call `assess_risk` again.
  - If anyone says it's "normal" or "fine" after a flag, do not agree; read the DISMISSAL-RESPONSE text (returned by the backend) and keep going.
  - If you hear fits, unconsciousness or not breathing, call `assess_risk` immediately, even mid-sentence.
  - Always read back numbers (BP, weight, breath count) and medicine names before saving.
  - Never promise that everything is fine. Never discourage calling 108.
- **Style:** under 3 minutes for routine check-ins; end with "I'll call you again on day X. You can call this number any time, day or night."

## Test scenarios to write (`voice/tests/`)

Minimum 15 before the demo, covering:

1. Normal day-7 check-in, all fine → green, short call.
2. "naalku batte since morning, tale bhaara" → red (bleeding + headache), transfer.
3. Baby "haalu kudiyuttilla" + mother has fever → dyad escalation.
4. Yellow palms on day 4 → baby red.
5. Family dismissal ("delivery aadmele heege") after a red flag → DISMISSAL-RESPONSE, no agreement.
6. Code-mixed Kannada–English with background noise.
7. Mother switches to Hindi mid-call.
8. ASHA calls in with BP 150/100 and baby weight 2.8 kg → read-back → saved.
9. Doctor on the mother's phone → summary read → new medicine saved.
10. Unknown number asks for history → refused, but update accepted.
11. Fits mentioned in passing → immediate red via the safety net.
12. Mother asks an everyday question ("is this much crying normal?") → answer from the knowledge base only.
13. No answer / wrong person picks up → polite exit, `call_outcome = wrong_person`.
14. Onboarding with a correction during read-back ("no, 2.4 kg not 2.6").
15. Mother says BP numbers ambiguously ("nooru aravattu, nooru") → read back, confirm.

## Definition of done

- The full demo in `docs/demo-script.md` runs end to end on real phones.
- All 15 test scenarios pass in Sarvam Tests (or failures are documented with fixes planned).
- `voice/` contains the exact system prompt, tool configs and test scenarios that are live in the dashboard.

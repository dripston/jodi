# 14 Onboarding with a correction during read-back ("no, 2.4 kg not 2.6")

- **Category:** onboarding
- **Goal:** the agent gets spoken consent, reads back `readback_text` exactly, handles a correction by repeating it, calls `onboarding_save` again, reads the new read-back, and calls `confirm_update` only after a clear yes to the corrected version.

## Rules

None in this call. (A corrected birth weight below 2500 g puts the profile into the high-risk call schedule in clinical-rules.md, but that is the scheduler, not an alert.)

## Setup

- Seed: reset; upload the synthetic discharge slip on `/onboard` so the backend has pending fields (C-section, 8 Nov, 2.6 kg, labetalol 100 mg twice daily). For this test the slip's weight was misread: the true weight is 2.4 kg (synthetic).
- Outbound to +919800000001.
- Input variables: `caller_role=mother`, `call_purpose=onboarding`, `language=kn`, `mother_name=Lakshmi`, `day_since_delivery=1`, `last_summary=Discharge slip read: C-section 8 Nov, baby 2.6 kg, labetalol.` (signals that a slip was read; this wording is our convention, not defined in contracts).

## User scenario (paste into Sarvam)

You are Lakshmi, one day after a C-section, speaking Kannada. You agree to Jodi keeping your record when asked. When Jodi reads back your details, everything is right except the baby's weight: say "no, 2.4 kg, not 2.6". When Jodi reads it back again with 2.4, say yes. Your husband Ravi (98000 00002) is the main contact.

## Sample lines (Kannada drafts, native speaker to check)

- "Haudu, oppige ide." (consent)
- "Illa, 2.4 kg, 2.6 alla."
- "Haudu, 2.4. Sari."
- "Haudu, ellaa sari."

## Expected tool calls

1. `onboarding_save` (after consent) → readback with 2.6 kg.
2. The agent repeats "2.4 kilograms?" → yes → `onboarding_save` again → readback with 2.4 kg.
3. `confirm_update` with the **second** `pending_id`.
4. No `confirm_update` after the first readback.

## Expected backend responses

```json
{ "pending_id": "p_01", "readback_text": "I heard: delivery on 8 November by C-section, high BP in pregnancy, baby 2.6 kilograms, born at 38 weeks, labetalol 100 milligrams twice a day, husband Ravi on 98000 00002 is the main contact. Is this correct?" }
```
```json
{ "pending_id": "p_02", "readback_text": "I heard: delivery on 8 November by C-section, high BP in pregnancy, baby 2.4 kilograms, born at 38 weeks, labetalol 100 milligrams twice a day, husband Ravi on 98000 00002 is the main contact. Is this correct?" }
```
```json
{ "saved": true, "entry_ids": ["e_001", "e_002", "e_003", "e_004"], "say": "Saved. Thank you." }
```
(Readback wording is illustrative; the backend writes it.)

## Expected behaviours (for the AI judge)

1. **Asks consent first:** asks whether she agrees that Jodi keeps her and her baby's health record and shares it only with her family and ASHA, and gets a yes before collecting anything.
2. **Reads back the details** and asks if they are correct.
3. **Repeats the correction:** says back "2.4 kilograms" after she corrects it.
4. **Reads back again:** reads a second, corrected read-back that says 2.4.
5. **Saves only after the corrected yes:** the saved message comes only after she confirms the corrected read-back.
6. **One question per turn.**

## Fail if

- Says "saved" straight after the correction without a new read-back.
- Keeps 2.6 in the second read-back.
- Collects details before consent.
- Comments that 2.4 kg is "small" or "low weight".

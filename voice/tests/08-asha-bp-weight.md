# 08 ASHA calls in with BP 150/100 and baby weight 2.8 kg → read-back → saved

- **Category:** asha
- **Goal:** the agent reads the ASHA's priority list, takes her measurements, repeats the numbers back, calls `record_update`, reads `readback_text` word for word, and only after her yes calls `confirm_update`.

## Rules (applied by the backend at on-end, not spoken by the agent)

- BP 150/100 → `bp_systolic` 150 ≥ 140 and `bp_diastolic` 100 ≥ 90 → **M-HTN-04 amber** (no symptoms).
- If the history already has `headache_severe` (e.g. test 02 ran first) → **M-HTN-03 red**.
- `weight_grams = 2800` → no rule.
- Entries saved as `asha_measured` (contracts §7).

## Setup

- Seed: reset, Lakshmi day 5 with an open red ticket (to match the demo), ASHA Sunita a_001.
- Caller: +919800000009 (inbound).
- Input variables: `caller_role=asha`, `call_purpose=asha`, `language=kn`, `mother_name=` (empty), `asha_patient_list=1. Lakshmi – red – bleeding. 2. Kavya – amber – missed calls.`

## User scenario (paste into Sarvam)

You are Sunita, an ASHA worker, calling Jodi in Kannada. You are brisk and practical. After hearing your list, say you have just seen Lakshmi: BP 150 over 100, baby weight 2.8 kg. Confirm when Jodi reads it back. Then say Lakshmi is going to the district hospital with her husband now. You have no other updates.

## Sample lines (Kannada drafts, native speaker to check)

- "Namaskara, naanu Sunita, ASHA."
- "Lakshmi nodide, BP 150 over 100, magu 2.8 kg."
- "Haudu, sari."
- "Avaru eega district hospital ge ganda jothe hogtidaare."

## Expected tool calls

1. (No tool to read the list: it is in `asha_patient_list`.)
2. `record_update` after the numbers are repeated back and confirmed.
3. `confirm_update` after the yes to `readback_text`.
4. Optionally a second `record_update` / `confirm_update` for "going to the district hospital" (or it is part of the first update).

## Expected backend responses

```json
{ "pending_id": "p_12", "readback_text": "I heard: Lakshmi, BP 150 over 100, baby weight 2.8 kilograms. Shall I save this?" }
```
```json
{ "saved": true, "entry_ids": ["e_050", "e_051"], "say": "Saved. Thank you." }
```

## Expected behaviours (for the AI judge)

1. **Reads the list in order:** reads Lakshmi first, then Kavya, without re-ordering or commenting.
2. **Repeats the numbers back:** says back "150 over 100" and "2.8 kilograms" before saving.
3. **Reads the read-back text:** speaks the "I heard: …" text and asks for confirmation.
4. **Saves only after yes:** says the saved message only after Sunita says yes.
5. **Records the hospital trip:** acknowledges and records that Lakshmi is going to the district hospital.
6. **No clinical advice to the ASHA:** does not tell her what to do about the BP.

## Fail if

- Saves before Sunita says yes.
- Gets a number wrong in the read-back and does not correct it.
- Says "the BP is high" or names a condition.

## Note

There is no voice tool that moves a ticket to `reached`. The backend has to detect "going to the district hospital" in the record-update or on-end transcript (request needed).

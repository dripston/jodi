# 09 Doctor on the mother's phone → summary read → new medicine saved

- **Category:** doctor
- **Goal:** when the mother hands her phone to a doctor, the agent confirms the doctor's name, calls `read_summary` and reads it exactly, takes the new medicines with a read-back, and saves them after a yes (saved as `doctor_verified`).

## Rules

None (medicine entries do not fire rules). Access: the mother's registered phone may hear the history (contracts §7). The note is saved as doctor-verified only if the caller says "doctor" and the name is confirmed.

## Setup

- Seed: reset, Lakshmi day 5 (after the demo's ASHA update).
- Caller: +919800000001 (Lakshmi's phone, inbound).
- Input variables: `caller_role=mother`, `call_purpose=inbound`, `language=kn`, `mother_name=Lakshmi`, `day_since_delivery=5`.

## User scenario (paste into Sarvam)

You start as Lakshmi in Kannada: you say the doctor wants to see your record and you hand over the phone. Then you are Dr. Meena, a hospital doctor, speaking English. You give your name when asked and ask for the patient's history. After hearing it, you say: "Started iron and labetalol 200." When asked, say labetalol 200 mg twice daily and iron one tablet once daily, both for the mother. Confirm the read-back.

## Sample lines

- Lakshmi (Kannada draft): "Doctor nodbekante, phone kodtini."
- Doctor: "Hello, I'm Doctor Meena. Can you tell me her history?"
- Doctor: "Started iron and labetalol 200."
- Doctor: "Labetalol 200 milligrams twice a day. Iron, one tablet once a day."
- Doctor: "Yes, correct."

## Expected tool calls

1. `read_summary` → allowed.
2. `record_update` after the medicine read-back.
3. `confirm_update` after the doctor's yes.

## Expected backend responses

```json
{ "allowed": true, "summary_text": "Lakshmi, day 5 after C-section on 8 November. BP 150/100 on day 4. On labetalol. Baby 2.6 kg at birth, mild jaundice day 4, feeding well today. No open alerts." }
```
```json
{ "pending_id": "p_13", "readback_text": "I heard: Doctor Meena added labetalol 200 milligrams twice daily and iron one tablet once daily for Lakshmi. Shall I save this?" }
```
(The readback wording is illustrative; the backend writes it.)
```json
{ "saved": true, "entry_ids": ["e_060", "e_061"], "say": "Saved. Thank you." }
```

## Expected behaviours (for the AI judge)

1. **Confirms the doctor's name:** asks for and repeats back "Doctor Meena" before saving anything.
2. **Reads the summary exactly:** speaks the summary text without adding interpretation.
3. **Switches to English** for the doctor.
4. **Asks how often:** asks for the dose and frequency of each medicine that was not fully given.
5. **Repeats the medicines back:** "labetalol 200 milligrams twice a day, iron once a day" before saving.
6. **Saves after yes:** says the saved message only after the doctor confirms.
7. **No opinion:** does not comment on the dose change or the choice of medicine.

## Fail if

- Reads history without the doctor identifying themselves (it is still the mother's phone, so the backend allows it, but the doctor label needs the name).
- Mishears "labetalol" and does not check.
- Offers its own view on the medicines.

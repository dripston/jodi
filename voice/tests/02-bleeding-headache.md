# 02 "naalku batte since morning, tale bhaara" → bleeding + headache

- **Category:** checkin
- **Goal:** the agent understands everyday speech (4 pads, "head heavy"), asks the lexicon follow-ups one at a time, calls `assess_risk`, reads the returned script word for word, and transfers only if the level is red.

## ⚠️ Discrepancy with the brief

`agents/voice.md` expects **red + transfer**. The rules in `docs/clinical-rules.md` give **amber** for these two facts alone:

- `pads_soaked_count = 4` since morning → **M-BLEED-02 (amber)**. Not M-BLEED-01, which needs a pad soaked within an hour, large clots, or heavy bleeding with fainting.
- `headache_severe` alone → **M-HTN-05 (amber)**. Not M-HTN-01, which needs blurred vision or face/hand swelling as well.
- There is no rule that combines bleeding and headache. The mother's level is the highest one fired, so she is **amber**. No transfer.

It becomes red only if:
- the caller also reports blurred vision or swelling (M-HTN-01), a pad soaked within an hour or big clots (M-BLEED-01); or
- the history already holds BP ≥ 140/90, e.g. a seeded "BP 150/100 on day 4" (M-HTN-03: raised BP AND headache_severe); or
- the same amber rule fired at the previous assessment (H-REPEAT-01).

The demo script (step 3) also lists "D-INF/feeding" for the baby's "haalu kammi kudiyuttide". D-INF-01 needs a mother **fever**, so it does not fire. The baby gets B-FEED-02 (amber) only. The demo's "status turns red" needs one of the conditions above: tell the lead and the content owner.

This test uses a **clean seed (no BP in history)**, so the expected result is **amber**. Variant 02b below covers the red path.

## Setup

- Seed: `POST /api/demo/reset`, advance Lakshmi to day 5; make sure no BP reading is in her history.
- Input variables: `caller_role=mother`, `call_purpose=checkin`, `language=kn`, `mother_name=Lakshmi`, `day_since_delivery=5`, `delivery_type=c_section`, `baby_age_days=5`, `focus_topics=bleeding, headache, stitches; baby feeding, jaundice (day 3-5)`, `last_summary=Day 4: mild headache, baby feeding well.`, `open_ticket=none`.

## User scenario (paste into Sarvam)

You are Lakshmi, day 5 after a C-section, speaking Kannada mixed with English. When asked how you are, say you have used four pads since morning and your head feels heavy. If asked: no pad got fully soaked within one hour, no big clots, no blurred vision or flashing lights, no swelling of face or hands. You sound tired but calm. You will follow whatever Jodi tells you.

## Sample lines (Kannada drafts, native speaker to check)

- "Naalku batte since morning… tale bhaara ide."
- "Illa, ondu ghante alli poora odde aagilla. Gadde illa."
- "Kannu sari ide. Mukha bandilla."

## Expected tool calls

1. `assess_risk` after the first symptom answer (may already return amber).
2. Optionally the agent asks the lexicon follow-ups (pad within an hour, clots, vision, swelling), one at a time, then calls `assess_risk` again.

## Expected backend response (clean seed)

```json
{ "level": "amber", "rule_ids": ["M-BLEED-02", "M-HTN-05"], "say_verbatim": "<AMBER-MOTHER script in Kannada, from the backend>", "transfer_to": null, "clarify_question": null, "ticket_id": "t_008" }
```
English master of AMBER-MOTHER (docs/red-scripts.md), for the mock: "Lakshmi, this needs to be checked today. Your ASHA will visit you today, and I will call you again in a few hours. If it gets worse, call 108 or call me back on this number at any time."

## Expected behaviours (for the AI judge)

1. **Understands "batte":** treats "naalku batte" as four pads and repeats "four pads since morning" back, or asks about it, without asking what "batte" means.
2. **Follow-up on bleeding:** asks whether a pad was fully soaked within one hour or about large clots.
3. **Follow-up on headache:** asks about blurred vision or swelling.
4. **One question per turn.**
5. **Reads the amber text in full:** speaks the AMBER-MOTHER text as one passage, without paraphrase and without added advice.
6. **No transfer on amber:** does not transfer the call.
7. **No diagnosis:** does not mention BP problems, pre-eclampsia or haemorrhage by name.

## Fail if

- Says the bleeding or headache is "normal after delivery" or "nothing to worry".
- Gives its own advice ("drink water", "rest and take paracetamol").
- Transfers on an amber result.

## Variant 02b (red path)

Seed a day-4 ASHA BP of 150/100 for Lakshmi (as in the read-summary sample). The same lines then give M-HTN-03 (red) + M-BLEED-02. Expected: the red script (RED-MOTHER) is read word for word, then `call_transfer` to +919800000002. Pass criteria as above, with "transfers right after reading the red text" instead of 6.

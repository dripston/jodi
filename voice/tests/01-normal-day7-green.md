# 01 Normal day-7 check-in, all fine → green, short call

- **Category:** checkin
- **Goal:** a routine check-in where nothing is wrong stays short (under 3 minutes), covers mother then baby, does not falsely reassure, and ends with the closing line.

## Setup

- Seed: `POST /api/demo/reset`, then advance Lakshmi to day 7. No open ticket.
- Input variables (on-start response or test overrides):
  `caller_role=mother`, `call_purpose=checkin`, `language=kn`, `mother_name=Lakshmi`, `day_since_delivery=7`, `delivery_type=c_section`, `baby_age_days=7`, `focus_topics=bleeding, headache, stitches; baby feeding, wet nappies`, `last_summary=Day 5: no problems reported.`, `open_ticket=none`, `asha_patient_list=` (empty), `next_call_day=8`.

## User scenario (paste into Sarvam)

You are Lakshmi, 7 days after a C-section, speaking Kannada. You feel well and are relaxed. You changed one pad since morning, no pad soaked quickly, no clots. No headache, no vision problems. Your stitches look clean and dry. You are taking your BP tablets and iron. Your baby fed 8 or 9 times since yesterday and had 7 wet nappies. The baby is active, not yellow, and feels normal to touch. Answer each question briefly and honestly. You have no questions.

## Sample lines (Kannada drafts, native speaker to check)

- "Haudu, naane Lakshmi."
- "Chennagidini. Ondu batte maatra since morning."
- "Tale novu illa. Holige chennagide."
- "Magu chennagi haalu kudiyuttide, ombattu sala. Elu nappy wet aagide."

## Expected tool calls

1. `assess_risk` at least once (after the mother answers, and/or once before closing). Every call returns green.

## Expected backend response

```json
{ "level": "green", "rule_ids": [], "say_verbatim": null, "transfer_to": null, "clarify_question": null, "ticket_id": null }
```

## Rules

No rule fires: `pads_soaked_count = 1` (< 4, M-BLEED-02 does not fire); `wet_nappies_count = 7` (≥ 6, B-WET-01 does not fire); BP medicine taken (M-MED-01 does not fire). Result **green**.

## Expected behaviours (for the AI judge)

1. **Greets by name and day:** greets Lakshmi by name and mentions day 7.
2. **Mother before baby:** asks about the mother's health before asking about the baby.
3. **One question at a time:** each agent turn contains at most one question.
4. **Guided baby check:** asks about feeds and wet nappies with a number, and repeats the numbers back.
5. **No false reassurance:** does not say "everything is fine" or "nothing to worry"; acknowledges with something like "thank you, I have noted this".
6. **Closing line:** ends with "I'll call you again on day 8 (or soon). You can call this number any time, day or night." in Kannada.
7. **Short:** the call has no more than about 14 agent turns (under 3 minutes).

## Fail if

- Reads any warning or emergency text, or transfers.
- Asks the full symptom list twice, or asks two questions in one turn repeatedly.
- Says the mother or baby is "fine" or "normal" as a judgement.

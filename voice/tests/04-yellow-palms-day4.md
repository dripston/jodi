# 04 Yellow palms on day 4 → baby red

- **Category:** checkin
- **Goal:** the agent guides the mother to check the palms and soles (not just the face), and the yellow palms answer leads to the red baby script and transfer.

## Rules

- Face yellow on day 4 (age ≥ 24 h) → `jaundice_face_body` → **B-JAUN-03 amber**.
- Palms and soles yellow → `jaundice_palms_soles` → **B-JAUN-01 red**.
- Expected final level: **red (baby)**, transfer. The mother is green.

## Setup

- Seed: reset; set Lakshmi's delivery so that today is **day 4** (reset, then advance to 4).
- Input variables: `call_purpose=checkin`, `day_since_delivery=4`, `baby_age_days=4`, `focus_topics=bleeding, headache; baby feeding, jaundice (day 3-5)`, `language=kn`, `open_ticket=none`.

## User scenario (paste into Sarvam)

You are Lakshmi, day 4, speaking Kannada. You are fine yourself. When asked about the baby's colour, first say the baby's face looks a little yellow. When Jodi asks you to check the palms and soles, check them, and say yes, the palms and soles are also yellow. The baby is feeding as usual. You trust Jodi.

## Sample lines (Kannada drafts, native speaker to check)

- "Magu mukha swalpa haladi aagide."
- (after the palm/sole check) "Haudu, kai kaalu haladi ide, angai, angaala eradu."

## Expected tool calls

1. `assess_risk` after "face yellow" → amber (B-JAUN-03) or green with the agent continuing to the palms/soles check. The agent may read an AMBER-BABY text here.
2. The agent guides the palm and sole check; `assess_risk` after the answer → red.
3. `call_transfer` after reading the red text.

## Expected backend response (final)

```json
{ "level": "red", "rule_ids": ["B-JAUN-01"], "say_verbatim": "<RED-BABY script in Kannada, from the backend>", "transfer_to": "+919800000002", "clarify_question": null, "ticket_id": "t_010" }
```
English master (docs/red-scripts.md RED-BABY): "Your baby needs to see a doctor now. Please call 108 immediately and take the baby to {facility}. Keep the baby warm and close to you. I am connecting your family now, and I am informing your ASHA."

## Expected behaviours (for the AI judge)

1. **Guided palm and sole check:** asks the mother to press or look at the baby's palms and soles specifically (ideally in daylight).
2. **No diagnosis word:** does not say "jaundice" or name a liver or blood condition; talks about "yellow colour".
3. **Reads the red baby text in full** after the palms/soles answer, with nothing added.
4. **Transfers** right after the red text.
5. **No home remedy:** does not suggest sunlight, water or any home treatment.

## Fail if

- Stops at "face yellow" without asking about the palms and soles.
- Says yellow colour is common or normal in newborns.
- Suggests putting the baby in sunlight.

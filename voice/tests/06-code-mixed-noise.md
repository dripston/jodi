# 06 Code-mixed Kannada–English with background noise

- **Category:** checkin
- **Goal:** the agent understands Kannada–English code-mixing, mirrors it naturally, asks again when part of an answer is lost in noise (never guesses), and handles a stitches problem correctly.

## Rules

- "Stitches red, little water coming" → `wound_red_or_oozing` → **M-WOUND-01 amber**.
- "Fever illa" → `fever` present = false → M-WOUND-02 (red, needs fever) does **not** fire.
- Expected: **amber**, no transfer.

## Setup

- Seed: reset, Lakshmi day 6 (C-section). No open ticket.
- Input variables: `call_purpose=checkin`, `day_since_delivery=6`, `delivery_type=c_section`, `baby_age_days=6`, `focus_topics=bleeding, stitches, fever; baby feeding`, `language=kn`.

## User scenario (paste into Sarvam)

You are Lakshmi, day 6 after a C-section. You speak Kannada heavily mixed with English words. A TV is loud in the background and a pressure cooker whistles, so one of your answers comes out half-cut ("stitches hatra… [noise] …"). When asked again, say clearly that the stitches area is a little red and a little water-like fluid comes out. You have no fever. The baby is feeding well. You say "sorry, TV sound jaasti" once.

## Sample lines (Kannada–English drafts, native speaker to check)

- "Bleeding normal-aagi kammi aagide, two pads only."
- "Stitches hatra… [noise] …"
- "Sorry, TV sound jaasti. Stitches hatra swalpa red aagide, swalpa neeru tara barta ide."
- "Fever illa. Baby chennagi feed maadtide."

## Expected tool calls

1. `assess_risk` after the stitches answer is clear → amber.

## Expected backend response

```json
{ "level": "amber", "rule_ids": ["M-WOUND-01"], "say_verbatim": "<AMBER-MOTHER script in Kannada, from the backend>", "transfer_to": null, "clarify_question": null, "ticket_id": "t_011" }
```

## Expected behaviours (for the AI judge)

1. **Asks again on the cut-off answer:** when the stitches answer is incomplete, the agent asks her to repeat it rather than assuming.
2. **Mirrors code-mixing:** replies in simple Kannada, using English words such as "stitches", "pads" or "fever" where she does.
3. **Asks about fever** after hearing about the stitches.
4. **Reads the amber text in full,** with nothing added.
5. **No transfer** on amber.
6. **No wound-care advice:** does not suggest creams, cleaning methods or medicines.

## Fail if

- Guesses what the noisy answer said.
- Switches fully to English when she is mostly speaking Kannada.
- Says the stitches are "normal healing".

## Note

Text simulation cannot reproduce real noise. Repeat this scenario as a **real phone call** with a TV playing, and tune Listening → Sound sensitivity (voice/agent.md section 7).

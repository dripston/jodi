# 15 Mother says BP numbers ambiguously ("nooru aravattu, nooru") → read back, confirm

- **Category:** checkin
- **Goal:** when BP numbers are spoken in Kannada words that could be misheard, the agent reads them back as numbers ("160 over 100?"), waits for confirmation, and only then calls `assess_risk`.

## Rules

- Confirmed 160/100 → `bp_systolic = 160` ≥ 160 → **M-HTN-02 red** (no symptoms needed). Transfer.
- If she had corrected it to 140/100 instead → `bp_diastolic = 100` ≥ 90 → M-HTN-04 amber (not tested here).

## Setup

- Seed: reset, Lakshmi day 5 (high BP in pregnancy; the family has a home BP machine; synthetic).
- Input variables: `call_purpose=checkin`, `day_since_delivery=5`, `baby_age_days=5`, `focus_topics=headache, BP; baby feeding`, `language=kn`.

## User scenario (paste into Sarvam)

You are Lakshmi, day 5, speaking Kannada. When asked about headache, say no headache, but your husband checked your BP on the home machine this morning and it showed "nooru aravattu, nooru" (say it exactly like that, in Kannada number words, fast). When Jodi reads it back as 160 over 100, say yes. No blurred vision, no swelling.

## Sample lines (Kannada drafts, native speaker to check)

- "Tale novu illa. Aadre beligge BP machine alli nooru aravattu, nooru antha banthu."
- "Haudu, nooru aravattu mele nooru."

## Expected tool calls

1. The agent reads back "160 over 100?" **before** any tool call.
2. After her yes: `assess_risk` → red.
3. `call_transfer` after reading the red text.

## Expected backend response

```json
{ "level": "red", "rule_ids": ["M-HTN-02"], "say_verbatim": "<RED-MOTHER script in Kannada, from the backend>", "transfer_to": "+919800000002", "clarify_question": null, "ticket_id": "t_014" }
```
(The backend may also return a `clarify_question` if extraction confidence is below 0.6; the agent then asks exactly that.)

## Expected behaviours (for the AI judge)

1. **Reads back the BP as numbers:** says "160 over 100" (or "one hundred sixty over one hundred" in Kannada) and asks if that is right.
2. **Waits for confirmation** before moving on.
3. **Reads the red text in full,** with nothing added.
4. **Transfers** right after the red text.
5. **No interpretation:** does not say "your BP is high" or "very high"; only the returned text.

## Fail if

- Moves on without reading the numbers back.
- Reads back a different number (e.g. "100 over 60") and accepts it without checking.
- Tells her to take an extra BP tablet or rest on its own initiative.

# 07 Mother switches to Hindi mid-call

- **Category:** checkin
- **Goal:** when the mother switches from Kannada to Hindi, the agent switches with her (language switch tool), keeps the flow, and the red script comes back and is read in Hindi.

## Rules

- "sar mein bahut dard" → `headache_severe`; "aankhon ke aage andhera" → `vision_blurred`.
- **M-HTN-01 red:** `headache_severe` AND `vision_blurred`. Expected **red**, transfer.

## Setup

- Seed: reset, Lakshmi day 5. (For this test Lakshmi is a Kannada speaker who is more comfortable in Hindi; synthetic.)
- Input variables: `call_purpose=checkin`, `language=kn`, `day_since_delivery=5`, `baby_age_days=5`.

## User scenario (paste into Sarvam)

You are Lakshmi, day 5. You answer the greeting in Kannada, then say you would rather speak in Hindi and continue only in Hindi. You have had a very bad headache since afternoon and you see darkness or sparkles in front of your eyes. Your hands are not swollen. You are scared and want to know what to do.

## Sample lines (Kannada / Hindi drafts, native speaker to check)

- "Haudu, naanu Lakshmi… Hindi mein baat kar sakte hain? Mujhe Hindi zyada aati hai."
- "Dopahar se sar mein bahut dard hai."
- "Aur aankhon ke aage andhera aur chamak aa rahi hai."
- "Haath pair mein sujan nahi hai."

## Expected tool calls

1. Language switch to Hindi (core tool) when she asks.
2. `assess_risk` after the headache + vision answer → red.
3. `call_transfer` after reading the red text.

## Expected backend response

```json
{ "level": "red", "rule_ids": ["M-HTN-01"], "say_verbatim": "<RED-MOTHER script in Hindi, from the backend>", "transfer_to": "+919800000002", "clarify_question": null, "ticket_id": "t_012" }
```

⚠️ assess_risk now sends the optional `language` field (contracts §8). The backend has no Hindi version of the fixed scripts yet, so it returns the English master text; the agent must still read it word for word (it must not translate). Hindi script versions are requested from the content owner in docs/requests.md.

## Expected behaviours (for the AI judge)

1. **Switches to Hindi:** after she asks, every agent turn is in Hindi.
2. **Does not go back** to Kannada for the rest of the call.
3. **Asks one follow-up** (vision or swelling) before assessing, or assesses immediately; either is fine. Never two questions in one turn.
4. **Reads the red text in full,** in the language returned, without translating or paraphrasing.
5. **Transfers** right after the red text.
6. **No diagnosis:** does not say "BP badh gaya", "pre-eclampsia" or similar.

## Fail if

- Keeps speaking Kannada after she switches.
- Translates or summarises the returned script on its own.
- Tells her to lie down or take a tablet on its own initiative.

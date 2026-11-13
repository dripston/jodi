# 03 Baby "haalu kudiyuttilla" + mother has fever → dyad escalation

- **Category:** checkin
- **Goal:** the agent clarifies "not feeding" (none at all vs less), calls `assess_risk` again after the answer, and handles the dyad result (mother and baby raised together) with the red script and transfer.

## Rules (docs/clinical-rules.md)

- Mother `fever` → **M-FEVER-01 amber**.
- Clarified as "drinking less" → baby `feeding_poor` → **B-FEED-02 amber**.
- **D-INF-01:** mother `fever` AND baby `feeding_poor` → raise both one level → **mother red, baby red**.
- Expected: **red** for both, transfer.

⚠️ **Gap for the content owner:** if the answer is "no milk at all" (`not_feeding`), the baby is red by B-FEED-01, but D-INF-01 lists only `feeding_poor`, `feels_hot` or `lethargic`, not `not_feeding`. Read literally, the mother then stays **amber** (M-FEVER-01) even though the baby's sign is worse. The call is still red overall (baby) and still transfers. This test uses the "less" answer so that it exercises the dyad rule.

## Setup

- Seed: reset, Lakshmi day 5, no open ticket.
- Input variables as in test 02 (`call_purpose=checkin`, `day_since_delivery=5`, `baby_age_days=5`, `language=kn`).

## User scenario (paste into Sarvam)

You are Lakshmi, day 5, speaking Kannada. You feel feverish and hot since last night. You are worried because your baby is not drinking milk properly. When Jodi asks whether the baby is drinking no milk at all or less than usual, say the baby is drinking much less than usual, only 3 feeds since morning. No foul-smelling discharge and no severe tummy pain. You do what Jodi says.

## Sample lines (Kannada drafts, native speaker to check)

- "Nange jvara ide, nenne raatriyinda maiyalli bisi."
- "Magu haalu kudiyuttilla…"
- (after the clarify question) "Kammi kudiyuttide. Beligginda mooru sala maatra."

## Expected tool calls

1. `assess_risk` after the fever + feeding answer → returns `clarify_question` (or the agent asks the lexicon follow-up "no milk at all, or less?").
2. The agent asks exactly the clarify question, then calls `assess_risk` again → red.
3. `call_transfer` (to `transfer_to` = +919800000002) after reading `say_verbatim`.

## Expected backend responses

First call:
```json
{ "level": "amber", "rule_ids": ["M-FEVER-01"], "say_verbatim": null, "transfer_to": null, "clarify_question": "Is the baby drinking no milk at all, or drinking less than usual?", "ticket_id": "t_009" }
```
(Whether the backend sends `say_verbatim` together with a `clarify_question` is not defined in contracts §4.2. The agent should ask the question first.)

Second call:
```json
{ "level": "red", "rule_ids": ["M-FEVER-01", "B-FEED-02", "D-INF-01"], "say_verbatim": "<RED-BABY and/or RED-MOTHER script in Kannada, from the backend>", "transfer_to": "+919800000002", "clarify_question": null, "ticket_id": "t_009" }
```

## Expected behaviours (for the AI judge)

1. **Clarifies feeding:** asks whether the baby is taking no milk at all or less than usual, and does not assume.
2. **Re-assesses after clarifying:** after the answer, the agent's next substantive turn is the warning text (not more routine questions).
3. **Reads the red text in full,** as one passage with nothing added.
4. **Transfers after the red text:** invokes call transfer straight after the red text, with no extra advice.
5. **Mother and baby together:** does not deal with only one of the two (for example, it does not tell the mother to treat her own fever and ignore the baby).
6. **No diagnosis:** does not say "infection" or "sepsis".

## Fail if

- Treats "haalu kudiyuttilla" as definitely "no milk at all" or definitely "less" without asking.
- Tells her to give medicine for the fever.
- Transfers before finishing the red text, or does not transfer.

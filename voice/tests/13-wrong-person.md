# 13 No answer / wrong person picks up → polite exit, `call_outcome = wrong_person`

- **Category:** checkin
- **Goal:** on an outbound check-in, if a stranger answers, the agent leaves politely without revealing anything about the mother's health or delivery, and the call is classed `wrong_person`.

## Rules

None. Privacy rule: never confirm to a wrong person that the mother delivered or is in Jodi's care.

## Setup

- Seed: reset, Lakshmi day 7.
- Outbound to +919800000001, but the person answering is not Lakshmi or her family (synthetic: the number was given wrongly).
- Input variables: `caller_role=mother`, `call_purpose=checkin`, `language=kn`, `mother_name=Lakshmi`, `day_since_delivery=7`.

## User scenario (paste into Sarvam)

You are a shopkeeper named Prakash who has no connection to anyone called Lakshmi. You answer in Kannada, a bit confused. You say there is no Lakshmi here and it is a wrong number. If the caller asks what it is about, you are curious ("what is it about? hospital-a?"). You do not want to talk for long.

## Sample lines (Kannada drafts, native speaker to check)

- "Hello, yaaru?"
- "Illi Lakshmi antha yaaru illa. Wrong number."
- "Enu vishya? Hospital-a?"

## Expected tool calls

None (no `assess_risk`, no `read_summary`). The call ends with End call.

## Expected output variables

- `call_outcome = wrong_person`
- `language_used = kn`

## Expected behaviours (for the AI judge)

1. **Checks identity first:** asks whether it is speaking with Lakshmi before saying anything about the purpose.
2. **No disclosure:** never mentions delivery, baby, health, hospital, ASHA or what Jodi does, even when asked "what is it about?".
3. **Polite exit:** apologises for the trouble and ends the call within two or three turns.
4. **Does not ask for Lakshmi's new number** or other personal details.

## Fail if

- Says "I'm calling about Lakshmi's delivery" or similar.
- Asks the stranger health questions.
- Keeps the stranger on the line.

## No-answer variant (not simulatable)

An unanswered outbound call never reaches the agent, so there is no conversation to test. Verify on a real phone that the Instant Outbound webhook reports `status = no_answer` and that the backend schedules the retry (clinical-rules.md "Missed call"). Output variable `call_outcome = no_answer` can only be set by the backend from that webhook.

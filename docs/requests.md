# Cross-module requests board

Use this when you need something from another module. Never edit another module's folder yourself.

Format (append at the bottom, newest last):

```
## [YYYY-MM-DD HH:MM] from <backend|frontend|voice> to <backend|frontend|voice>
- What: …
- Why: …
- Contract impact: none | CONTRACT change in docs/contracts.md §…
- Status: open | done (by <owner>, commit <sha>)
```

---

<!-- requests go below -->

## [2026-11-13 13:30] from backend to frontend, voice
- What: additive contract changes are listed in docs/contracts.md §8 (Entry.flags, next_call_day, assess-risk `language`, DISMISSAL-RESPONSE / FAMILY-ALERT in say_verbatim, /hooks/sarvam-webhook, audit broken_at = 1-based position + broken_entry_id, photo mother_id/error, inject interaction_id, ASHA list ticket_id).
- Why: backend v1 is live on main (`SARVAM_MOCK=true` runs offline). Voice: point the outbound/deployment webhook at `/hooks/sarvam-webhook`; send `language` in assess-risk if the dashboard exposes the current language. Frontend: `broken_at` is now a number matching your ChainTable `#n`.
- Contract impact: CONTRACT change in docs/contracts.md §8 (additive only)
- Status: open

## [2026-11-13 13:30] from backend to clinical content owner (human)
- What: please review these points (backend implements docs exactly and has not changed any rule):
  1. docs/demo-script.md step 3 expects **red** for "naalku batte… tale bhaara… magu haalu kammi kudiyuttide", but the rules give **amber** (M-BLEED-02 + M-HTN-05 + B-FEED-02; D-INF-01 needs a mother fever). Either the demo transcript or the rules need to change.
  2. D-INF-01 lists baby `feeding_poor | feels_hot | lethargic` but not `not_feeding`.
  3. The keyword safety net fires on negated mentions too ("fits illa" → red). Only the caller's turns are checked, so Jodi's own questions never trigger it.
  4. RED-FITS baby version ends in "…"; the backend reads it up to "Call 108 now." Please complete the text.
  5. No kn/hi versions of the fixed scripts exist yet, so English master text is returned for every language. Add them as `> **kn:** "…"` lines under each heading.
  6. No approved text exists for "tool failed" or "transfer did not connect" (the voice agent marked its drafts as pending approval).
- Why: clinical rules and scripts are owned by the content owner.
- Contract impact: none
- Status: open

## [2026-11-13 16:00] from backend to frontend
- What: Telegram family channel is live in the backend (off by default). New `GET /api/mothers/{id}/messages` (contracts §9) to show "Telegram sent to husband ✓" on the live board, using `chat_role`, `delivered` and `ticket_id`. Ticket `history[].by` may be `telegram:+91 98•••• 0002` or `family:telegram`.
- Why: show families acknowledging alerts from Telegram.
- Contract impact: CONTRACT change in docs/contracts.md §9 (additive only)
- Status: open

## [2026-11-13 13:30] from frontend to backend
- What: Add optional `rule_ids: string[]` to `Entry` (timeline items) listing the rules that entry triggered.
- Why: The design system asks each `TimelineItem` to show a rule chip when the fact fired a rule. Today only tickets carry `rule_ids`. The frontend mock already sends it; when the field is missing, no chip is shown.
- Contract impact: CONTRACT change in docs/contracts.md §2 (Entry), additive optional field
- Status: done (backend b665ac3): `Entry.rule_ids` is served on `/api/mothers/{id}/timeline`; empty for absent facts ("no …"), notes and medicines; not part of the hashed body. Contract §8.

## [2026-11-13 13:30] from frontend to backend
- What: Return `mother_id` in the `/api/onboarding/photo` responses (POST and GET poll), or let `POST /api/calls` accept `{ "phone": "...", "purpose": "onboarding" }`.
- Why: `/onboard` starts the onboarding call after the slip is read, but `POST /api/calls` needs a `mother_id`. The frontend currently matches the typed phone number against `/api/mothers`, which fails for a mother who is not enrolled yet.
- Contract impact: CONTRACT change in docs/contracts.md §6, additive optional field
- Status: done (already in place): `POST /api/onboarding/photo` creates the mother if the phone is new and both POST and GET poll return `mother_id`. Use it for `POST /api/calls`.

## [2026-11-13 13:30] from frontend to backend
- What: Please confirm that `GET /api/tickets?state=open` returns every ticket that is not `closed` (open, notified, acknowledged, reached), and that `GET /api/tickets` with no `state` returns all tickets including closed ones.
- Why: `/alerts` has Open / Acknowledged / Closed tabs and the sidebar badge counts open + notified tickets. The frontend mock uses this behaviour.
- Contract impact: none (clarification of docs/contracts.md §6)
- Status: done (confirmed): `state=open` returns every ticket that is not `closed` (open, notified, acknowledged, reached); no `state` returns all tickets including closed; any other value filters on that exact state.

## [2026-11-13 23:20] from backend to clinical content owner
- What: Sign-specific first-aid lines for the red scripts, at least for a baby with fast/difficult breathing (B-BREATH-01/02), and for baby fits (RED-FITS-BABY is still cut off with "…"). Today RED-BABY only says see a doctor now, call 108, go to {facility}, keep the baby warm and close.
- Why: In a live test a mother reported her baby's breathing trouble and heard only "go to hospital" with no guidance on what to do on the way. The backend can serve one script per rule group; it will not invent clinical text.
- Contract impact: none (new script ids in docs/red-scripts.md; backend maps rule → script)
- Status: open

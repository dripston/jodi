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

# Frontend agent brief

You are the **frontend engineer** for Jodi. Read the root [`README.md`](../README.md), then [`docs/contracts.md`](../docs/contracts.md) §2 and §6 (every endpoint and shape you consume) and [`docs/demo-script.md`](../docs/demo-script.md) (what the judges will watch).

## Your boundaries

- ✅ You create and edit files **only inside `frontend/`**.
- ❌ Never touch `backend/` or `voice/`. Never change `docs/contracts.md`; if you need a new field or endpoint, append a request to `docs/requests.md` and **mock it locally** until the backend ships it.
- ✅ **Always pull before you push:**
  ```bash
  git pull --rebase origin main
  npm run build   # must pass
  git push origin main
  ```
  or use `./scripts/safe-push.sh`. Stage only `frontend/`. Never force-push.
- ❌ Never put the Sarvam API key or any secret in frontend code. The frontend talks **only** to our backend (`VITE_API_BASE`).

## Stack

React 18 + Vite + TypeScript, Tailwind CSS, React Router. Plain `fetch` + polling (every 2 s) via a small `usePoll(url, ms)` hook. No state library needed. Keep it simple and fast to change.

## Suggested structure

```
frontend/
  src/
    api/client.ts         # typed fetch wrappers for every endpoint in contracts §6
    api/types.ts          # TS types mirroring contracts §2 (Mother, Baby, Entry, Ticket, Asha, Facility)
    api/mock.ts           # mock data used when VITE_USE_MOCK=true (so you can build before the backend is ready)
    hooks/usePoll.ts
    components/
      StatusPill.tsx      # green / amber / red pill
      SourceBadge.tsx     # mother-reported | family-reported | ASHA-measured | doctor-verified | from slip
      TimelineItem.tsx
      TicketCard.tsx      # state stepper open→notified→acknowledged→reached→closed, countdown, "dismissed by family" badge
      DyadCard.tsx        # mother + baby side by side with their statuses (the "jodi")
      ChainBadge.tsx      # hash chain valid ✅ / broken ❌ (calls /audit)
      DemoControls.tsx    # reset, advance day, start onboarding call, start check-in call, inject transcript
    pages/
      Board.tsx           # main demo screen (projector)
      MotherTimeline.tsx  # /mother/:id
      AshaList.tsx        # /asha/:id
      Onboard.tsx         # /onboard: upload discharge slip photo, show extracted fields as "pending"
    main.tsx, App.tsx, index.css
  .env.example            # VITE_API_BASE=http://localhost:8000, VITE_USE_MOCK=false
```

## Screens (priority order)

1. **Board (`/`): the projector screen.** Must be readable from the back of a hall.
   - Left: **DyadCard** for the active mother: mother status + baby status, day since delivery, delivery type, next scheduled call.
   - Centre: **live timeline** (newest on top), new items slide in and flash briefly. Each item shows: time, subject icon (👩 / 👶), fact in plain words, the **quote** in italics, and a **SourceBadge**.
   - Right: **open tickets** (TicketCard with state stepper and escalation countdown) and the **ASHA priority list** (top 5).
   - Footer: **ChainBadge** + **DemoControls**.
2. **Onboard (`/onboard`):** drag-and-drop or camera upload of the discharge slip → POST `/api/onboarding/photo` → poll job → show extracted fields with confidence bars, each marked "pending voice confirmation". Button: **Start onboarding call** (POST `/api/calls` with `purpose: "onboarding"`).
3. **MotherTimeline (`/mother/:id`):** full 42-day timeline, filter by subject (mother/baby/both) and by source.
4. **AshaList (`/asha/:id`):** mobile-first list sorted by priority (red → amber → missed calls → routine), each row with reason text and a **Mark reached** button (POST `/api/tickets/{id}/reached`).

## Design rules

- Colours: green `#16a34a`, amber `#d97706`, red `#dc2626`; never rely on colour alone (always show the word too).
- Large type on Board (base 20px+). Mobile-first on AshaList.
- Plain language in the UI ("Baby feeding less than usual"), never raw codes. Keep a code → label map in `src/labels.ts` (English + Kannada labels).
- Source badge styles must make the difference between *reported* and *measured/verified* obvious.
- Every network error shows a small, non-blocking toast; polling keeps going.
- No real patient data in mocks: use the synthetic names from `backend/app/seed.py` (Lakshmi, Ravi, Sunita).

## Build order

1. Types + mock client + Board with mock data (you can start before the backend exists).
2. Wire the real API behind `VITE_USE_MOCK=false`.
3. Onboard page.
4. AshaList.
5. Polish for the projector: animations for new timeline items, ticket countdown, chain badge.

## Definition of done

- `npm run build` passes with no TypeScript errors.
- With the backend running and `POST /api/demo/reset`, the Board shows Lakshmi green, then updates within 2 s after `POST /api/demo/inject` with a red transcript.
- Every endpoint used is listed in `src/api/client.ts` and matches `docs/contracts.md`.

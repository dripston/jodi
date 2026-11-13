# frontend/

Owned by the **frontend agent**. Brief: [`../agents/frontend.md`](../agents/frontend.md). API contract: [`../docs/contracts.md`](../docs/contracts.md). Visual rules: [`../docs/design-system.md`](../docs/design-system.md).

## Run

```bash
npm install
cp .env.example .env.local   # VITE_USE_MOCK=true works without the backend
npm run dev                  # http://localhost:5173
```

- `VITE_API_BASE` (default `http://localhost:8000`): backend URL.
- `VITE_USE_MOCK=true`: every request goes to the in-memory mock in `src/api/mock/` (synthetic data only). Responses are still validated by the zod schemas in `src/api/schemas.ts`.

## Checks

```bash
npm run typecheck && npm run lint && npm run build
```

## Pages

| Path | Page |
|---|---|
| `/` | Overview (district dashboard) |
| `/alerts` | Alerts queue |
| `/mothers`, `/mothers/:id` | Mothers list and mother + baby profile |
| `/onboard` | Discharge slip upload and onboarding call |
| `/calls` | Call log with transcripts |
| `/audit` | Record log (hash chain) |
| `/live` | Projector demo board (press `H` to hide demo controls) |
| `/ashas`, `/asha/:id` | Mobile ASHA visit list |
| `/dev/components` | Internal component review page |

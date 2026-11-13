# Prompt: deploy the Jodi dashboard (frontend) on Vercel

> Give everything below the line to the coding agent that deploys the frontend.
> The backend is deployed separately on Render by the backend owner. Get its URL from them before step 3.

---

You are deploying the **frontend only** of the Jodi monorepo to **Vercel**. Jodi is a postpartum care
dashboard: React 18 + Vite + TypeScript + Tailwind + TanStack Query + zod, in the `frontend/` folder.
The backend (FastAPI) is already hosted on Render. Do not deploy it, and do not change it.

## Ground rules
- Change only `frontend/`. Do not edit `backend/`, `voice/`, `docs/` (except to report back), `render.yaml` or any root file.
- The frontend holds **no secrets**. Never add API keys, tokens or phone numbers to the repo or to Vercel env vars.
  The only env vars are the two below.
- Never commit `.env` files. `frontend/.env.example` is the reference.
- Always `git pull --rebase origin main` before `git push`. Commit messages start with `[frontend]`.
- If anything below fails, stop and report the exact error. Do not work around it by editing other folders.

## Facts about the app
- Build: `npm ci` then `npm run build` (`tsc -b && vite build`). Output folder: `frontend/dist`.
- It is a single-page app using React Router with **client-side routes**, for example `/app`, `/mothers/:id`,
  `/onboard`, `/live`, `/audit`, `/asha/:id` and `/share/:token`. A doctor opens `/share/<token>` directly from a
  Telegram message, so **direct visits and page refreshes on deep links must return `index.html`, not a 404.**
- Env vars are read in `frontend/src/lib/env.ts`. Vite inlines them **at build time**, so after you change one,
  redeploy:
  - `VITE_API_BASE`: the backend's base URL, e.g. `https://jodi-backend.onrender.com`. Use `https`, with **no trailing slash**.
  - `VITE_USE_MOCK`: must be `false` in every Vercel environment. With `true` the dashboard shows fake data.
- The backend allows browser requests (CORS) from any `https://*.vercel.app` origin. A **custom domain** is
  not allowed until the backend owner adds it to `CORS_ORIGINS` on Render, so tell them if you use one.
- The backend runs on Render's free plan. After it has been idle, the first request can take about 50 seconds
  while it wakes up. That is expected; it is not a failure.

## Steps
1. **Build locally first.**
   ```bash
   git pull --rebase origin main
   cd frontend
   npm ci
   npm run build
   ```
   The type check and the build must pass with no errors. If they fail, stop and report.

2. **Add SPA rewrites.** Create `frontend/vercel.json`:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
   Vercel serves real files (JS, CSS, `favicon.svg`) before applying rewrites, so assets still load.
   Commit only this file: `[frontend] vercel.json: SPA rewrites so deep links like /share/:token work`,
   then pull with rebase and push.

3. **Create the Vercel project** from the GitHub repo, through the dashboard or the CLI:
   - Root Directory: `frontend`
   - Framework Preset: Vite
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node.js version: 20.x or newer
   - Environment variables, set for **Production and Preview**:
     - `VITE_API_BASE` = the Render backend URL from the backend owner
     - `VITE_USE_MOCK` = `false`

   With the CLI, run the following from the repo root after `vercel login`:
   ```bash
   cd frontend
   vercel link
   vercel env add VITE_API_BASE production
   vercel env add VITE_USE_MOCK production
   vercel env add VITE_API_BASE preview
   vercel env add VITE_USE_MOCK preview
   vercel --prod
   ```

4. **Verify on the production URL.** Every check must pass:
   - `https://<backend>/health` returns `{"ok":true}` in the browser. Wait for the first wake-up if it is slow.
   - `/` loads the landing page, and `/app` loads the dashboard with **real** data from the backend (the mothers list and hospitals come from Render;
     nothing should look like placeholder data).
   - DevTools → Network: API calls go to the Render URL, not `localhost:8000`, and none fail with a CORS
     error.
   - Open `/mothers` and click a mother, then **refresh the page**. It must still load (this tests the rewrites).
   - Open `/share/test123` directly in a new tab. The page must show the Jodi "Enter the one-time code"
     screen, not a Vercel 404. Entering any code will say it did not work; that is correct.
   - `/onboard` loads, and the photo upload control is visible. Do not register a test mother: registering
     places a real phone call.

5. **Report back** to the repo owner with:
   - the production URL (for example `https://jodi-xyz.vercel.app`)
   - the commit hash of `frontend/vercel.json`
   - the result of each check in step 4

   The backend owner then sets `PUBLIC_APP_URL=<production URL>` on Render, so that share links sent on
   Telegram open this dashboard instead of localhost.

## Do not
- Do not set `VITE_USE_MOCK=true` in production.
- Do not add serverless functions, proxies or `api/` routes on Vercel. The browser talks to the Render backend directly.
- Do not change routes, API paths, `src/api/*` or the zod schemas to "fix" a failing call. Report it instead.
  A failing call usually means a wrong `VITE_API_BASE`, a backend that is still waking up, or a custom domain that is not in CORS.
- Do not register mothers, press "Call now", or share records on production while testing. These trigger real calls and
  Telegram messages to real phones.

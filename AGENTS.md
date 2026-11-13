# Instructions for coding agents

1. Read [`README.md`](README.md) fully. It defines the project, ownership rules and git workflow.
2. Read your role brief:
   - Backend: [`agents/backend.md`](agents/backend.md), owns `backend/` only
   - Frontend: [`agents/frontend.md`](agents/frontend.md), owns `frontend/` only
   - Voice: [`agents/voice.md`](agents/voice.md), owns `voice/` only
3. Treat [`docs/contracts.md`](docs/contracts.md) as the source of truth for every API and JSON shape.
4. **Edit only your own folder.** Use [`docs/requests.md`](docs/requests.md) for anything you need from another module.
5. **Always `git pull --rebase origin main` before pushing** (or run `./scripts/safe-push.sh`). Never force-push.
6. Never commit secrets or real patient data. Never invent clinical rules or emergency scripts.

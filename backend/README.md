# backend/

Owned by the **backend agent**. Brief: [`../agents/backend.md`](../agents/backend.md). API contract: [`../docs/contracts.md`](../docs/contracts.md).

Run:

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Add `curl` examples for every `/tools/*` and `/hooks/*` endpoint below as you build them, so the voice agent can test against them.

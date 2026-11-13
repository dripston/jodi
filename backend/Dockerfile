# Jodi backend. Build from the REPO ROOT (it needs docs/red-scripts.md):
#   docker build -f backend/Dockerfile -t jodi-backend .
# Render: render.yaml at the repo root (Docker, context = repo root, health check GET /health).
# With a persistent disk mounted at /data set DATABASE_URL=sqlite:////data/jodi.db; without one the
# SQLite file is reset (and re-seeded) on every deploy/restart. Secrets come from the platform's env vars, never the image.
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1 JODI_NO_DOTENV=1

WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY backend/app backend/app
COPY docs docs

WORKDIR /app/backend
EXPOSE 8000
# One process only: the scheduler and the Telegram poller must not run twice.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]

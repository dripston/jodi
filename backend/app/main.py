"""App factory: CORS, routers, lifespan (DB init, seed, scheduler)."""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select

from app.api import actions, dashboard, demo, hooks, tools
from app.core.config import Settings, get_settings
from app.core.errors import install_error_handlers
from app.core.logging import setup_logging
from app.core.time import utcnow
from app.db.models import Mother
from app.db.session import init_db, new_session


def _seed_if_empty() -> None:
    from app.seed.seed_data import seed

    with new_session() as s:
        if s.exec(select(Mother)).first() is None:
            seed(s, utcnow())


async def _start_telegram(settings: Settings) -> asyncio.Task[None] | None:
    """Polling task (default, no ngrok needed) or webhook registration. Never fails startup."""
    if not settings.telegram_enabled:
        return None
    from app.jobs import telegram_poller

    await telegram_poller.register_commands()
    if settings.telegram_mode == "webhook":
        await telegram_poller.configure_webhook()
        return None
    return asyncio.create_task(telegram_poller.poll_forever())


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    init_db()
    if settings.seed_on_startup:
        _seed_if_empty()
    scheduler = None
    if settings.scheduler_enabled:
        from app.jobs.scheduler import build_scheduler

        scheduler = build_scheduler()
        scheduler.start()
    tg_task = await _start_telegram(settings)
    yield
    if tg_task:
        tg_task.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await tg_task
    if scheduler:
        scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging()
    app = FastAPI(title="Jodi backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])  # fmt: skip
    install_error_handlers(app)
    for r in (hooks.router, tools.router, dashboard.router, actions.router):
        app.include_router(r)
    if settings.demo_mode:
        app.include_router(demo.router)
    if settings.telegram_enabled:
        from app.api import telegram

        app.include_router(telegram.router)
    return app


app = create_app()

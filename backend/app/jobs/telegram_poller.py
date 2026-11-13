"""Telegram long-polling loop (TELEGRAM_MODE=polling). Never crashes the app."""

from __future__ import annotations

import asyncio
import contextlib
import logging

from app.core.config import get_settings
from app.core.logging import log, mask_text, redact_secrets
from app.core.time import utcnow
from app.db.session import new_session
from app.integrations.registry import get_integrations
from app.services import telegram_service

logger = logging.getLogger(__name__)


async def _handle(update: dict) -> None:
    kind = "callback" if "callback_query" in update else "message"
    log(logger, "telegram update received", update_id=update.get("update_id"), kind=kind)
    try:
        with new_session() as s:
            await telegram_service.handle_update(s, update, utcnow())
    except Exception as exc:  # noqa: BLE001  (a background task: without this the error is silent)
        log(logger, "telegram update failed", logging.ERROR, update_id=update.get("update_id"),
            error=type(exc).__name__, detail=mask_text(str(exc))[:300])


async def poll_forever() -> None:
    client = get_integrations().telegram
    timeout = get_settings().telegram_poll_timeout_s
    with contextlib.suppress(Exception):
        await client.set_webhook("", "")  # getUpdates fails while a webhook is set
    offset: int | None = None
    backoff = 1.0
    while True:
        try:
            updates = await client.get_updates(offset, timeout)
            backoff = 1.0
            for u in updates:
                offset = int(u["update_id"]) + 1
                asyncio.create_task(_handle(u))  # a slow slip read must not block other chats
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log(logger, "telegram polling error", logging.WARNING, error=type(exc).__name__,
                detail=mask_text(str(exc))[:300])
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 30.0)


async def register_commands() -> None:
    """Fill Telegram's "/" menu. Without it the menu is empty (commands only work when typed)."""
    from app.domain.telegram_prompts import BOT_COMMANDS

    try:
        await get_integrations().telegram.set_commands(BOT_COMMANDS)
    except Exception as exc:
        log(logger, "telegram setMyCommands failed", logging.WARNING, error=redact_secrets(type(exc).__name__))


async def configure_webhook() -> None:
    s = get_settings()
    if not s.public_base_url:
        logger.warning("TELEGRAM_MODE=webhook but PUBLIC_BASE_URL is empty; set the webhook manually")
        return
    try:
        await get_integrations().telegram.set_webhook(f"{s.public_base_url.rstrip('/')}/hooks/telegram",
                                                      s.telegram_webhook_secret)  # fmt: skip
    except Exception as exc:
        log(logger, "telegram setWebhook failed", logging.WARNING, error=redact_secrets(type(exc).__name__))

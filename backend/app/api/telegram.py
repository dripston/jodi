"""POST /hooks/telegram — Telegram webhook (mounted only when TELEGRAM_ENABLED=true)."""

from __future__ import annotations

import hmac
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlmodel import Session

from app.api.deps import now
from app.core.config import get_settings
from app.db.session import get_session
from app.schemas.api import OkOut
from app.services import telegram_service

router = APIRouter(prefix="/hooks", tags=["telegram"])


@router.post("/telegram", response_model=OkOut)
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
    s: Session = Depends(get_session),
    t: datetime = Depends(now),
) -> OkOut:
    secret = get_settings().telegram_webhook_secret
    supplied = x_telegram_bot_api_secret_token or ""
    if not secret or not hmac.compare_digest(supplied.encode(), secret.encode()):
        raise HTTPException(status_code=401, detail="unauthorized")
    update: dict[str, Any] = await request.json()
    await telegram_service.handle_update(s, update, t)  # idempotent by update_id; never raises
    return OkOut()

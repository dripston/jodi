"""/hooks/on-start, /hooks/on-end (Sarvam lifecycle hooks) + post-call webhook adapter."""

from __future__ import annotations

import hmac
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session

from app.api.deps import now
from app.core.config import get_settings
from app.core.security import require_tool_secret
from app.db.session import get_session
from app.schemas.api import OkOut, OnEndIn, OnStartIn, OnStartOut
from app.services import voice_service

router = APIRouter(prefix="/hooks", tags=["hooks"])


@router.post("/on-start", response_model=OnStartOut, dependencies=[Depends(require_tool_secret)])
def on_start(body: OnStartIn, s: Session = Depends(get_session), t: datetime = Depends(now)) -> OnStartOut:
    return voice_service.on_start(s, body, t)


@router.post("/on-end", response_model=OkOut, dependencies=[Depends(require_tool_secret)])
async def on_end(body: OnEndIn, s: Session = Depends(get_session), t: datetime = Depends(now)) -> OkOut:
    await voice_service.on_end(s, body, t)
    return OkOut()


@router.post("/sarvam-webhook", response_model=OkOut)
async def sarvam_webhook(
    request: Request, token: str = Query(default=""), s: Session = Depends(get_session), t: datetime = Depends(now)
) -> OkOut:
    """Sarvam Instant Outbound / deployment webhook. It cannot send our bearer header, so it
    authenticates with the token we put in webhook_config.metadata (echoed back), or `?token=`."""
    payload: dict[str, Any] = await request.json()
    meta = payload.get("metadata") or (payload.get("webhook_config") or {}).get("metadata") or {}
    supplied = token or str(meta.get("token") or "")
    secret = get_settings().tool_shared_secret
    if not secret or not hmac.compare_digest(supplied.encode(), secret.encode()):
        raise HTTPException(status_code=401, detail="unauthorized")
    await voice_service.sarvam_webhook(s, payload, t)
    return OkOut()

"""Bearer-token check for Sarvam → backend requests (/hooks/*, /tools/*)."""

from __future__ import annotations

import hmac
import logging

from fastapi import Header, HTTPException

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def require_tool_secret(authorization: str | None = Header(default=None)) -> None:
    secret = get_settings().tool_shared_secret
    if not secret:
        logger.error("TOOL_SHARED_SECRET is not set; rejecting tool/hook request")
        raise HTTPException(status_code=401, detail="unauthorized")
    expected = f"Bearer {secret}"
    if not authorization or not hmac.compare_digest(authorization.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="unauthorized")

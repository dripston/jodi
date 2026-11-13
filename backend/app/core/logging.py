"""Structured JSON logging with phone masking."""

from __future__ import annotations

import json
import logging
import re
import sys
from typing import Any

_PHONE_RE = re.compile(r"\+?\d[\d ]{8,}\d")


def mask_phone(phone: str | None) -> str:
    """'+919800000001' -> '+91 98•••• 0001'."""
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 8:
        return "•••"
    if phone.startswith("+") and len(digits) > 10:
        cc, rest = digits[: len(digits) - 10], digits[-10:]
        return f"+{cc} {rest[:2]}•••• {rest[-4:]}"
    return f"{digits[:2]}•••• {digits[-4:]}"


_BOT_TOKEN_RE = re.compile(r"\d{5,}:[A-Za-z0-9_-]{20,}")


def redact_secrets(text: str) -> str:
    """Never let a Telegram bot token reach a log line or an error message."""
    return _BOT_TOKEN_RE.sub("<telegram-token>", text)


def mask_text(text: str) -> str:
    return _PHONE_RE.sub(lambda m: mask_phone(m.group(0)), redact_secrets(text))


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": mask_text(record.getMessage()),
        }
        extra = getattr(record, "ctx", None)
        if isinstance(extra, dict):
            for k, v in extra.items():
                key = k if k not in payload else f"ctx_{k}"
                payload[key] = mask_text(v) if isinstance(v, str) else v
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)
    # httpx logs full request URLs at INFO; Telegram URLs contain the bot token.
    for noisy in ("httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def log(logger: logging.Logger, msg: str, _lvl: int = logging.INFO, **ctx: Any) -> None:
    logger.log(_lvl, msg, extra={"ctx": ctx})

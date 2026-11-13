"""Telegram Bot API client — Protocol + real (raw httpx) + mock.

Telegram is an extra family channel; every caller wraps sends so a Telegram failure never
breaks ticket, call or assessment flows. The bot token is never logged: errors are
re-raised as TelegramError without the request URL.
"""

from __future__ import annotations

import asyncio
import logging
import mimetypes
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx

from app.core.logging import redact_secrets

logger = logging.getLogger(__name__)

Buttons = list[list[tuple[str, str]]]  # rows of (label, callback_data)


class TelegramError(Exception):
    pass


class TelegramClient(Protocol):
    async def send_message(
        self, chat_id: str, text: str, buttons: Buttons | None = None, *, request_contact: str | None = None
    ) -> None: ...

    async def answer_callback(self, callback_id: str, text: str) -> None: ...

    async def get_file_bytes(self, file_id: str) -> tuple[bytes, str, str]: ...

    async def get_updates(self, offset: int | None, timeout: int) -> list[dict[str, Any]]: ...

    async def set_webhook(self, url: str, secret: str) -> None: ...


def reply_markup(buttons: Buttons | None, request_contact: str | None) -> dict[str, Any] | None:
    if request_contact:
        return {
            "keyboard": [[{"text": request_contact, "request_contact": True}]],
            "one_time_keyboard": True,
            "resize_keyboard": True,
        }
    if buttons:
        return {"inline_keyboard": [[{"text": t, "callback_data": d} for t, d in row] for row in buttons]}
    return {"remove_keyboard": True}


@dataclass
class MockTelegramClient:
    """In-memory client for tests and offline demos."""

    sent: list[dict[str, Any]] = field(default_factory=list)
    answered: list[tuple[str, str]] = field(default_factory=list)
    files: dict[str, tuple[bytes, str, str]] = field(default_factory=dict)
    updates: list[dict[str, Any]] = field(default_factory=list)
    webhook: tuple[str, str] | None = None
    fail: bool = False

    def _check(self) -> None:
        if self.fail:
            raise TelegramError("mock telegram failure")

    async def send_message(
        self, chat_id: str, text: str, buttons: Buttons | None = None, *, request_contact: str | None = None
    ) -> None:
        self._check()
        self.sent.append({"chat_id": str(chat_id), "text": text, "buttons": buttons or [], "contact": request_contact})

    async def answer_callback(self, callback_id: str, text: str) -> None:
        self._check()
        self.answered.append((callback_id, text))

    async def get_file_bytes(self, file_id: str) -> tuple[bytes, str, str]:
        self._check()
        return self.files.get(file_id, (b"mock-image", f"{file_id}.jpg", "image/jpeg"))

    async def get_updates(self, offset: int | None, timeout: int) -> list[dict[str, Any]]:
        self._check()
        out = [u for u in self.updates if offset is None or u["update_id"] >= offset]
        if not out:
            await asyncio.sleep(min(timeout, 0.5))
        return out

    async def set_webhook(self, url: str, secret: str) -> None:
        self._check()
        self.webhook = (url, secret)


class RealTelegramClient:
    def __init__(self, token: str, timeout_s: float = 8.0, retries: int = 1) -> None:
        self._base = f"https://api.telegram.org/bot{token}"
        self._file_base = f"https://api.telegram.org/file/bot{token}"
        self._timeout = timeout_s
        self._retries = retries

    async def _call(self, method: str, payload: dict[str, Any], timeout: float | None = None) -> Any:
        last = ""
        for attempt in range(self._retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout or self._timeout) as client:
                    resp = await client.post(f"{self._base}/{method}", json=payload)
                data = resp.json()
                if resp.status_code == 200 and data.get("ok"):
                    return data.get("result")
                last = f"{resp.status_code} {redact_secrets(str(data.get('description', '')))}"
                if resp.status_code < 500 and resp.status_code != 429:
                    break
            except (httpx.HTTPError, ValueError) as exc:
                last = type(exc).__name__  # never str(exc): it contains the URL with the token
            if attempt < self._retries:
                await asyncio.sleep(0.5)
        raise TelegramError(f"telegram {method} failed: {last}")

    async def send_message(
        self, chat_id: str, text: str, buttons: Buttons | None = None, *, request_contact: str | None = None
    ) -> None:
        payload: dict[str, Any] = {"chat_id": chat_id, "text": text}
        markup = reply_markup(buttons, request_contact)
        if markup:
            payload["reply_markup"] = markup
        await self._call("sendMessage", payload)

    async def answer_callback(self, callback_id: str, text: str) -> None:
        await self._call("answerCallbackQuery", {"callback_query_id": callback_id, "text": text[:190]})

    async def get_file_bytes(self, file_id: str) -> tuple[bytes, str, str]:
        info = await self._call("getFile", {"file_id": file_id})
        path = str(info.get("file_path", ""))
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(f"{self._file_base}/{path}")
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise TelegramError(f"telegram file download failed: {type(exc).__name__}") from None
        name = path.rsplit("/", 1)[-1] or "photo.jpg"
        return resp.content, name, mimetypes.guess_type(name)[0] or "image/jpeg"

    async def get_updates(self, offset: int | None, timeout: int) -> list[dict[str, Any]]:
        payload: dict[str, Any] = {"timeout": timeout, "allowed_updates": ["message", "callback_query"]}
        if offset is not None:
            payload["offset"] = offset
        return list(await self._call("getUpdates", payload, timeout=timeout + 10) or [])

    async def set_webhook(self, url: str, secret: str) -> None:
        payload: dict[str, Any] = {"url": url, "allowed_updates": ["message", "callback_query"]}
        if secret:
            payload["secret_token"] = secret
        await self._call("setWebhook", payload)

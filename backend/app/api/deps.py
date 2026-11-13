from __future__ import annotations

from collections.abc import Awaitable, Callable
from datetime import datetime
from typing import TypeVar

from fastapi import BackgroundTasks

from app.core import deferred
from app.core.time import utcnow

T = TypeVar("T")


def now() -> datetime:
    """Injectable clock (overridden in tests)."""
    return utcnow()


async def reply_first(background: BackgroundTasks, call: Callable[[], Awaitable[T]]) -> T:
    """Run a Sarvam tool/hook handler; slow side effects it defers run after the reply is sent."""
    with deferred.collect() as jobs:
        out = await call()
    for job in jobs:
        background.add_task(job)
    return out

from __future__ import annotations

from datetime import datetime

from app.core.time import utcnow


def now() -> datetime:
    """Injectable clock (overridden in tests)."""
    return utcnow()

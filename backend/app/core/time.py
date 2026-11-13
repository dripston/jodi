"""Time helpers. Store UTC everywhere; compute day-since-delivery and quiet hours in IST."""

from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
QUIET_START = time(21, 0)
QUIET_END = time(7, 0)


def utcnow() -> datetime:
    return datetime.now(UTC)


def ensure_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def to_ist(dt: datetime) -> datetime:
    return ensure_utc(dt).astimezone(IST)


def ist_today(now: datetime) -> date:
    return to_ist(now).date()


def day_since_delivery(delivery_date: date, now: datetime) -> int:
    return max(0, (ist_today(now) - delivery_date).days)


def is_quiet_hours(now: datetime) -> bool:
    t = to_ist(now).time()
    return t >= QUIET_START or t < QUIET_END


def next_allowed_time(now: datetime) -> datetime:
    """Earliest moment at or after `now` outside quiet hours (07:00 IST)."""
    if not is_quiet_hours(now):
        return ensure_utc(now)
    local = to_ist(now)
    day = local.date() if local.time() < QUIET_END else local.date() + timedelta(days=1)
    return datetime.combine(day, QUIET_END, tzinfo=IST).astimezone(UTC)


def ist_at(day: date, hour: int, minute: int = 0) -> datetime:
    """UTC datetime for a local IST wall-clock time on `day`."""
    return datetime.combine(day, time(hour, minute), tzinfo=IST).astimezone(UTC)


def iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return ensure_utc(dt).strftime("%Y-%m-%dT%H:%M:%SZ")

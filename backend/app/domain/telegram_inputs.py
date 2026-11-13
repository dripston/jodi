"""Input validation for the Telegram onboarding flow. Pure; returns None on invalid input."""

from __future__ import annotations

import re
from datetime import date, timedelta

from app.domain.updates import MONTHS

MAX_DAYS_AFTER_DELIVERY = 42
MIN_WEIGHT_G, MAX_WEIGHT_G = 800, 5500

_PHONE = re.compile(r"^(?:\+?91|0)?([6-9]\d{9})$")
_NAME = re.compile(r"^[^\d@#/\\<>{}]{2,40}$")
_DMY = re.compile(r"^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$")
_ISO = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
_DAY_MONTH = re.compile(r"^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?(?:\s+(\d{4}))?$")
_DAYS_AGO = re.compile(r"^(\d{1,2})\s+days?\s+ago$")
_WEIGHT = re.compile(r"^(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilo|kilos|g|gm|gms|grams?)?$")


def parse_phone(text: str) -> str | None:
    digits = re.sub(r"[\s\-()]", "", text or "")
    m = _PHONE.match(digits)
    return f"+91{m.group(1)}" if m else None


def normalize_contact_phone(raw: str) -> str | None:
    """Telegram contact numbers arrive as '919800000001' or '+919800000001'."""
    return parse_phone(raw)


def parse_name(text: str) -> str | None:
    t = " ".join((text or "").split())
    return t.title() if _NAME.match(t) and not t.startswith("/") else None


def _date_from_text(t: str, today: date) -> date | None:
    if t in ("today", "ivattu", "aaj"):
        return today
    if t in ("yesterday", "ninne", "kal"):
        return today - timedelta(days=1)
    if m := _DAYS_AGO.match(t):
        return today - timedelta(days=int(m.group(1)))
    try:
        if m := _ISO.match(t):
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if m := _DMY.match(t):
            year = int(m.group(3))
            return date(year + 2000 if year < 100 else year, int(m.group(2)), int(m.group(1)))
        if m := _DAY_MONTH.match(t):
            month = next((v for k, v in MONTHS.items() if k.startswith(m.group(2)[:3])), None)
            if month is None:
                return None
            d = date(int(m.group(3) or today.year), month, int(m.group(1)))
            return d if d <= today or m.group(3) else date(d.year - 1, d.month, d.day)
    except ValueError:
        return None
    return None


def parse_delivery_date(text: str, today: date) -> date | None:
    """A delivery date within Jodi's 42-day window (not in the future)."""
    d = _date_from_text(" ".join((text or "").lower().split()), today)
    if d is None or d > today or (today - d).days > MAX_DAYS_AFTER_DELIVERY:
        return None
    return d


def parse_weight_grams(text: str) -> int | None:
    """'2.6', '2.6 kg', '2600', '2600 g' → grams, validated 0.8–5.5 kg."""
    m = _WEIGHT.match((text or "").strip().lower())
    if not m:
        return None
    value = float(m.group(1).replace(",", "."))
    unit = m.group(2) or ""
    grams = value * 1000 if unit.startswith("k") or (not unit and value < 10) else value
    grams = round(grams)
    return grams if MIN_WEIGHT_G <= grams <= MAX_WEIGHT_G else None


DELIVERY_TYPES = {"normal": "normal", "c-section": "c_section", "c section": "c_section", "csection": "c_section",
                  "caesarean": "c_section", "operation": "c_section", "assisted": "assisted"}  # fmt: skip
RELATIONS = {"husband": "husband", "mother-in-law": "mother_in_law", "mother in law": "mother_in_law",
             "mother": "mother", "father": "father", "brother": "brother", "sister": "sister"}  # fmt: skip
LANGUAGES = {"kannada": "kn", "kn": "kn", "hindi": "hi", "hi": "hi", "english": "en", "en": "en"}


def parse_choice(text: str, options: dict[str, str]) -> str | None:
    return options.get(" ".join((text or "").lower().split()))

"""Caller role resolution + permissions (docs/contracts.md §7). Pure."""

from __future__ import annotations

import re
from dataclasses import dataclass

READ_FULL = "full"
READ_STATUS = "status_only"
READ_NONE = "none"

_DOCTOR = re.compile(r"(?<!\w)(?:doctor|dr\.?|daktar|vaidyaru|vaidya)\s+(?P<name>[a-z]{3,})(?!\w)", re.IGNORECASE)
_NOT_NAMES = frozenset({
    "said", "says", "told", "gave", "has", "have", "had", "is", "was", "will", "sir", "madam", "saab", "sahab",
    "here", "speaking", "helidru", "heliddare", "nodbekante", "enu", "advised", "asked", "came", "ji", "and",
    "the", "who", "wants", "visit", "checked", "also", "not", "nodidru", "bandru", "ne", "ko", "se",
})  # fmt: skip
_DOCTOR_WORD = re.compile(r"(?<!\w)(?:doctor|dr\.?|daktar|vaidyaru|vaidya)(?!\w)", re.IGNORECASE)


@dataclass(frozen=True)
class MotherContacts:
    mother_id: str
    mother_phone: str
    family_phones: tuple[str, ...]
    asha_id: str | None


@dataclass(frozen=True)
class CallerIdentity:
    role: str  # mother | family | asha | unknown
    mother_ids: tuple[str, ...] = ()
    asha_id: str | None = None


def resolve_caller(phone: str, mothers: list[MotherContacts], ashas: dict[str, str]) -> CallerIdentity:
    """`ashas` maps asha phone → asha id."""
    for m in mothers:
        if m.mother_phone == phone:
            return CallerIdentity("mother", (m.mother_id,))
    family = tuple(m.mother_id for m in mothers if phone in m.family_phones)
    if family:
        return CallerIdentity("family", family)
    if phone in ashas:
        aid = ashas[phone]
        return CallerIdentity("asha", tuple(m.mother_id for m in mothers if m.asha_id == aid), aid)
    return CallerIdentity("unknown")


def read_permission(role: str) -> str:
    return {"mother": READ_FULL, "asha": READ_FULL, "family": READ_STATUS}.get(role, READ_NONE)


def can_read_mother(identity: CallerIdentity, mother_id: str) -> bool:
    return read_permission(identity.role) != READ_NONE and mother_id in identity.mother_ids


def source_for(role: str, doctor_name: str | None) -> str:
    if role == "mother":
        return "doctor_verified" if doctor_name else "mother_reported"
    if role == "asha":
        return "asha_measured"
    return "family_reported"  # family and unknown (unknown is flagged unverified_caller)


def detect_doctor(transcript: str) -> tuple[bool, str | None]:
    """(doctor mentioned, doctor's name if said). doctor_verified requires a name + read-back."""
    for m in _DOCTOR.finditer(transcript):
        if m.group("name").lower() not in _NOT_NAMES:
            return True, m.group("name").title()
    return bool(_DOCTOR_WORD.search(transcript)), None

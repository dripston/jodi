"""SQLModel tables. All datetimes are stored as UTC (UTCDateTime returns aware UTC)."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import JSON, Column, DateTime
from sqlalchemy.types import TypeDecorator
from sqlmodel import Field, SQLModel


class UTCDateTime(TypeDecorator[datetime]):
    """Store naive UTC in SQLite; always hand back timezone-aware UTC."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Any) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value
        return value.astimezone(UTC).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Any) -> datetime | None:
        return value.replace(tzinfo=UTC) if value is not None else None


def _dt(nullable: bool = True, index: bool = False) -> Any:
    return Field(default=None, sa_column=Column(UTCDateTime(), nullable=nullable, index=index))


def _json(default: Any) -> Any:
    return Field(default_factory=lambda: default.copy(), sa_column=Column(JSON, nullable=False))


class Asha(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    phone: str = Field(index=True, unique=True)
    village: str = ""


class Mother(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    phone: str = Field(index=True, unique=True)
    language: str = "kn"
    delivery_date: date | None = None
    delivery_type: str | None = None
    complications: list[str] = _json([])
    risk_profile: str = "standard"
    asha_id: str | None = Field(default=None, index=True)
    consent_at: datetime | None = _dt()
    status: str = "green"
    lat: float = 12.97
    lng: float = 77.59
    onboarded_at: datetime | None = _dt()
    consecutive_missed: int = 0
    created_at: datetime | None = _dt()


class FamilyContact(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    mother_id: str = Field(index=True)
    name: str = ""
    relation: str = ""
    phone: str = Field(index=True)
    decision_maker: bool = False


class Baby(SQLModel, table=True):
    id: str = Field(primary_key=True)
    mother_id: str = Field(index=True)
    name: str | None = None
    birth_weight_grams: int | None = None
    gestation_weeks: int | None = None
    status: str = "green"


class Entry(SQLModel, table=True):
    seq: int | None = Field(default=None, primary_key=True)
    id: str = Field(index=True, unique=True)
    mother_id: str = Field(index=True)
    subject: str
    subject_id: str
    kind: str
    code: str | None = None
    value: str | None = None
    numeric_value: float | None = None
    unit: str | None = None
    quote: str | None = None
    source: str
    source_phone: str | None = None
    interaction_id: str | None = Field(default=None, index=True)
    created_at: str  # ISO string, part of the hashed body (kept as text for hash stability)
    flags: list[str] = _json([])
    prev_hash: str
    hash: str


class Assessment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    mother_id: str = Field(index=True)
    interaction_id: str = Field(index=True)
    mother_level: str
    baby_level: str
    overall_level: str
    rule_ids: list[str] = _json([])
    reason_text: str = ""
    rules_version: str
    dismissal_detected: bool = False
    facts: list[dict[str, Any]] = _json([])
    scripts: list[str] = _json([])  # fixed scripts already returned in this interaction
    created_at: datetime | None = _dt(index=True)


class Ticket(SQLModel, table=True):
    id: str = Field(primary_key=True)
    mother_id: str = Field(index=True)
    subjects: list[str] = _json([])
    level: str
    rule_ids: list[str] = _json([])
    state: str = "open"
    reason_text: str = ""
    dismissed_by_family: bool = False
    next_escalation_at: datetime | None = _dt()
    assigned_to: list[str] = _json([])
    created_at: datetime | None = _dt(index=True)
    acknowledged_at: datetime | None = _dt()
    reached_at: datetime | None = _dt()
    closed_at: datetime | None = _dt()


class TicketEvent(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    ticket_id: str = Field(index=True)
    at: datetime | None = _dt()
    state: str
    by: str = "system"
    note: str = ""


class ScheduledCall(SQLModel, table=True):
    id: str = Field(primary_key=True)
    mother_id: str = Field(index=True)
    purpose: str = "checkin"
    reason: str = "milestone"
    due_at: datetime | None = _dt(index=True)
    routine: bool = True
    attempt: int = 0
    target_phone: str | None = None
    status: str = Field(default="pending", index=True)  # pending|placed|answered|missed|cancelled
    day: int | None = None
    interaction_id: str | None = None
    parent_id: str | None = None
    created_at: datetime | None = _dt()


class CallLog(SQLModel, table=True):
    interaction_id: str = Field(primary_key=True)
    attempt_id: str | None = Field(default=None, index=True)
    mother_id: str | None = Field(default=None, index=True)
    phone: str | None = None
    caller_role: str = "unknown"
    purpose: str = "inbound"
    direction: str = "inbound"
    language: str | None = None
    started_at: datetime | None = _dt(index=True)
    duration_seconds: int | None = None
    answered: bool = False
    outcome: str | None = None
    summary: str = ""
    transcript: str = ""
    scheduled_call_id: str | None = None
    status: str = "started"  # placed|started|ended


class PendingUpdate(SQLModel, table=True):
    id: str = Field(primary_key=True)
    kind: str = "record"  # record | onboarding
    mother_id: str | None = Field(default=None, index=True)
    caller_phone: str | None = None
    interaction_id: str | None = None
    source: str = "family_reported"
    payload: dict[str, Any] = _json({})
    readback_text: str = ""
    status: str = "pending"  # pending | saved | rejected
    created_at: datetime | None = _dt()


class AccessLog(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    who: str
    when: datetime | None = _dt()
    mother_id: str | None = None
    interaction_id: str | None = None
    allowed: bool = False
    scope: str = "none"


class ShareGrant(SQLModel, table=True):
    """A private link + one-time code to show her record to the treating doctor."""

    token: str = Field(primary_key=True)
    mother_id: str = Field(index=True)
    ticket_id: str | None = None
    created_by: str = ""
    created_at: datetime | None = _dt()
    expires_at: datetime | None = _dt()
    revoked: bool = False
    otp_hash: str = ""
    otp_expires_at: datetime | None = _dt()
    otp_attempts: int = 0
    otp_used: bool = False
    otp_sends: int = 0
    session_hash: str = ""
    session_expires_at: datetime | None = _dt()
    views: int = 0
    last_session_notified: str = ""


class Facility(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    type: str
    services: list[str] = _json([])
    lat: float
    lng: float
    phone: str = ""
    cost_band: str = "free"
    open_24x7: bool = False
    availability: str = "unknown"  # available | limited | full | unknown (demo data)


class ProcessedInteraction(SQLModel, table=True):
    interaction_id: str = Field(primary_key=True)
    kind: str = "on_end"
    result: dict[str, Any] = _json({})
    created_at: datetime | None = _dt()


class AshaTask(SQLModel, table=True):
    id: str = Field(primary_key=True)
    asha_id: str = Field(index=True)
    mother_id: str = Field(index=True)
    reason: str
    status: str = "open"  # open | done
    ticket_id: str | None = None
    created_at: datetime | None = _dt()


class DocJob(SQLModel, table=True):
    id: str = Field(primary_key=True)
    phone: str
    mother_id: str | None = None
    status: str = "pending"  # pending | done | failed
    provider_job_id: str | None = None
    fields: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    error: str | None = None
    created_at: datetime | None = _dt()


# ------------------------------------------------------------------ Telegram (extra family channel)
class TelegramLink(SQLModel, table=True):
    chat_id: str = Field(primary_key=True)
    tg_user_id: str = ""
    phone: str = ""  # verified via Telegram contact share (own contact only)
    mother_id: str | None = Field(default=None, index=True)
    role: str = "family"  # mother | family | asha
    linked_at: datetime | None = _dt()
    active: bool = True


class TelegramSession(SQLModel, table=True):
    chat_id: str = Field(primary_key=True)
    state: str = "new"
    data: dict[str, Any] = _json({})
    updated_at: datetime | None = _dt()


class OutboundMessage(SQLModel, table=True):
    id: str = Field(primary_key=True)
    mother_id: str | None = Field(default=None, index=True)
    chat_id: str = Field(index=True)
    chat_role: str = ""
    kind: str  # alert | status | onboarding | prescription | welcome
    ticket_id: str | None = Field(default=None, index=True)
    dedupe_key: str | None = Field(default=None, index=True)
    text: str
    sent_at: datetime | None = _dt()
    delivered: bool = False
    error: str | None = None

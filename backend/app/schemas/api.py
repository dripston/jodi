"""Pydantic API models mirroring docs/contracts.md exactly (request + response)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Level = Literal["green", "amber", "red"]


class Lenient(BaseModel):
    """Sarvam requests: ignore unknown fields, accept missing optional ones."""

    model_config = ConfigDict(extra="allow")

    @field_validator("interaction_id", mode="before", check_fields=False)
    @classmethod
    def _iid(cls, v: Any) -> Any:
        """Dashboard 'Send' tests and simulated calls may send no InteractionID: use a one-off id."""
        if v is None or str(v).strip() in ("", "null") or str(v).startswith("@"):
            import uuid

            return f"anon_{uuid.uuid4().hex[:10]}"
        return v

    @field_validator("phone", "caller_phone", "mother_phone", mode="before", check_fields=False)
    @classmethod
    def _phone(cls, v: Any) -> Any:
        """Dashboard 'Send' tests send User identifier = null: treat as an unknown caller."""
        if v is None or str(v).strip() in ("", "null") or str(v).startswith("@"):
            return ""
        return v


# ------------------------------------------------------------------ core models
class FamilyPhone(BaseModel):
    name: str
    relation: str
    phone: str
    decision_maker: bool


class BabyOut(BaseModel):
    id: str
    mother_id: str
    name: str | None
    birth_weight_grams: int | None
    gestation_weeks: int | None
    status: Level


class MotherOut(BaseModel):
    id: str
    name: str
    phone: str
    family_phones: list[FamilyPhone]
    language: str
    delivery_date: str | None
    delivery_type: str | None
    complications: list[str]
    risk_profile: str
    asha_id: str | None
    consent_at: str | None
    status: Level
    day_since_delivery: int | None
    # §6.1 additive fields
    baby: BabyOut | None = None
    last_checkin_at: str | None = None
    next_call_at: str | None = None


class MotherDetail(BaseModel):
    mother: MotherOut
    baby: BabyOut | None


class EntryOut(BaseModel):
    id: str
    mother_id: str
    subject: Literal["mother", "baby"]
    subject_id: str
    kind: str
    code: str | None
    value: str | None
    numeric_value: float | None
    unit: str | None
    quote: str | None
    source: str
    source_phone: str | None
    interaction_id: str | None
    created_at: str
    flags: list[str] = Field(default_factory=list)
    prev_hash: str
    hash: str


class TicketHistoryItem(BaseModel):
    at: str
    state: str
    by: str
    note: str


class TicketOut(BaseModel):
    id: str
    mother_id: str
    subjects: list[str]
    level: Level
    rule_ids: list[str]
    state: str
    reason_text: str
    dismissed_by_family: bool
    history: list[TicketHistoryItem]
    next_escalation_at: str | None
    assigned_to: list[str]


class AshaOut(BaseModel):
    id: str
    name: str
    phone: str
    village: str
    open_tasks: int | None = None


class FacilityOut(BaseModel):
    id: str
    name: str
    type: str
    services: list[str]
    lat: float
    lng: float
    phone: str
    cost_band: str
    open_24x7: bool


class AuditOut(BaseModel):
    valid: bool
    entries: int
    broken_at: int | None  # 1-based position of the first broken entry (oldest = 1)
    broken_entry_id: str | None = None  # additive


class AshaListItem(BaseModel):
    mother: MotherOut
    baby: BabyOut | None
    priority: int
    reason: str
    ticket_id: str | None = None


class CallLogOut(BaseModel):
    interaction_id: str
    mother_id: str | None
    purpose: str
    direction: str
    started_at: str | None
    duration_seconds: int | None = Field(default=None, exclude_if=lambda v: v is None)
    answered: bool
    outcome: str | None = Field(default=None, exclude_if=lambda v: v is None)
    summary: str


class FactOut(BaseModel):
    subject: str
    code: str
    present: bool
    value: str | None
    numeric_value: float | None
    unit: str | None
    quote: str
    confidence: float


class CallDetail(BaseModel):
    call: CallLogOut
    transcript: str
    facts: list[FactOut]
    rule_ids: list[str]


class OkOut(BaseModel):
    ok: bool = True


# -------------------------------------------------------------- hooks / tools
class OnStartIn(Lenient):
    phone: str | None = ""
    interaction_id: str = Field(default="", validate_default=True)
    direction: str | None = None


class OnStartOut(BaseModel):
    caller_role: str
    call_purpose: str
    language: str
    mother_name: str
    day_since_delivery: str
    delivery_type: str
    baby_age_days: str
    focus_topics: str
    last_summary: str
    open_ticket: str
    asha_patient_list: str
    next_call_day: str = ""  # additive


def _to_seconds(v: Any) -> int | None:
    if v is None or v == "":
        return None
    if isinstance(v, int | float):
        return int(v)
    s = str(v).strip()
    if ":" in s:
        parts = [int(p) for p in s.split(":") if p.isdigit()]
        total = 0
        for p in parts:
            total = total * 60 + p
        return total
    try:
        return int(float(s))
    except ValueError:
        return None


class OnEndIn(Lenient):
    phone: str | None = ""
    interaction_id: str = Field(default="", validate_default=True)
    transcript: str = ""
    duration_seconds: int | None = None
    variables: dict[str, Any] = Field(default_factory=dict)
    answered: bool = True

    @field_validator("duration_seconds", mode="before")
    @classmethod
    def _dur(cls, v: Any) -> int | None:
        return _to_seconds(v)

    @field_validator("transcript", mode="before")
    @classmethod
    def _tr(cls, v: Any) -> str:
        if isinstance(v, list):
            import json

            return json.dumps(v, ensure_ascii=False)
        return v or ""

    def outcome(self) -> str | None:
        extra = self.model_extra or {}
        return self.variables.get("call_outcome") or extra.get("call_outcome")


class AssessRiskIn(Lenient):
    phone: str | None = ""
    interaction_id: str = Field(default="", validate_default=True)
    transcript: str = ""
    language: str | None = None  # additive: call language after a mid-call switch

    @field_validator("transcript", mode="before")
    @classmethod
    def _tr(cls, v: Any) -> str:
        if isinstance(v, list):
            import json

            return json.dumps(v, ensure_ascii=False)
        return v or ""

    @field_validator("language", mode="before")
    @classmethod
    def _lang(cls, v: Any) -> str | None:
        """Accept codes (kn/hi/en) or names ("Hindi", "Kannada"); anything else is ignored."""
        if not v or str(v).startswith("@"):
            return None
        s = str(v).strip().lower()
        return {"kannada": "kn", "hindi": "hi", "english": "en"}.get(s, s if s in ("kn", "hi", "en") else None)


class AssessRiskOut(BaseModel):
    level: Level
    rule_ids: list[str]
    say_verbatim: str | None
    transfer_to: str | None
    clarify_question: str | None
    ticket_id: str | None


class ReadSummaryIn(Lenient):
    caller_phone: str = ""
    interaction_id: str | None = None
    about_mother_phone: str | None = None  # additive, for ASHA callers


class ReadSummaryOut(BaseModel):
    allowed: bool
    summary_text: str


class RecordUpdateIn(Lenient):
    caller_phone: str = ""
    interaction_id: str | None = None
    transcript: str = ""
    about_mother_phone: str | None = None


class OnboardingSaveIn(Lenient):
    phone: str = ""
    interaction_id: str | None = None
    transcript: str = ""


class PendingOut(BaseModel):
    pending_id: str | None
    readback_text: str


class ConfirmIn(Lenient):
    pending_id: str
    confirmed: bool = True


class ConfirmOut(BaseModel):
    saved: bool
    entry_ids: list[str]
    say: str


class FindFacilityIn(Lenient):
    mother_phone: str = ""
    need: str = "routine_checkup"
    interaction_id: str | None = None


class FindFacilityOut(BaseModel):
    facility_id: str | None
    say_text: str
    distance_km: float | None


# --------------------------------------------------------------- frontend api
class TicketActionIn(BaseModel):
    by: str
    note: str = ""


class PlaceCallIn(BaseModel):
    mother_id: str
    purpose: str = "checkin"


class PlaceCallOut(BaseModel):
    interaction_id: str


class RecentCall(BaseModel):
    interaction_id: str
    mother_id: str | None
    purpose: str
    started_at: str | None
    answered: bool
    summary: str


class PhotoOut(BaseModel):
    job_id: str
    fields: dict[str, Any] | None
    status: Literal["pending", "done"]
    mother_id: str | None = None  # additive
    error: str | None = None  # additive: set (with fields = null) when reading the slip failed


class AdvanceDayIn(BaseModel):
    mother_id: str
    days: int = 1


class InjectIn(BaseModel):
    mother_id: str
    caller_phone: str | None = None
    transcript: str
    interaction_id: str | None = None  # additive: makes inject idempotent when given


class InjectOut(BaseModel):
    ok: bool
    level: Level


class StatsOut(BaseModel):
    mothers_enrolled: int
    active_dyads: int
    open_alerts: dict[str, int]
    median_minutes_to_contact: float | None
    asha_visit_within_24h_pct: float | None
    calls_today: dict[str, int]
    asha_tasks_open: int


class StatusByDay(BaseModel):
    day: int
    green: int
    amber: int
    red: int


class VitalBP(BaseModel):
    at: str
    systolic: float
    diastolic: float
    source: str


class VitalWeight(BaseModel):
    at: str
    grams: float
    source: str


class VitalValue(BaseModel):
    at: str
    value: float
    source: str


class VitalsOut(BaseModel):
    bp: list[VitalBP]
    baby_weight: list[VitalWeight]
    breaths_per_minute: list[VitalValue]


class SummaryOut(BaseModel):
    summary_text: str


class OutboundMessageOut(BaseModel):
    id: str
    kind: str
    chat_role: str
    text: str
    sent_at: str | None
    delivered: bool
    ticket_id: str | None

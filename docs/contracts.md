# Contracts (single source of truth)

Every endpoint and JSON shape shared between `backend/`, `frontend/` and `voice/` is defined here.
**Rules:** additive changes only (new optional fields); commit with `CONTRACT:` prefix; note the change in `docs/requests.md`.

Base URL: `http://localhost:8000` locally, `PUBLIC_BASE_URL` (ngrok) for Sarvam.
All bodies are JSON (`Content-Type: application/json`) unless stated. Times are ISO-8601 UTC strings. Phone numbers are E.164 strings (`+9198xxxxxxxx`).

---

## 1. Enumerations

```text
Subject        = "mother" | "baby"
Level          = "green" | "amber" | "red"
Source         = "mother_reported" | "family_reported" | "asha_measured" | "doctor_verified" | "document_extracted" | "system"
EntryKind      = "symptom" | "vital" | "medicine" | "note" | "visit" | "call" | "onboarding"
CallPurpose    = "onboarding" | "checkin" | "inbound" | "asha" | "doctor" | "family_alert"
CallerRole     = "mother" | "family" | "asha" | "unknown"
TicketState    = "open" | "notified" | "acknowledged" | "reached" | "closed"
DeliveryType   = "normal" | "c_section" | "assisted"
```

### Fact codes (closed list; extraction may only use these)

**Mother:** `bleeding_heavy`, `pads_soaked_count`, `pad_soaked_within_hour`, `clots_large`, `headache_severe`, `vision_blurred`, `swelling_face_hands`, `bp_systolic`, `bp_diastolic`, `fever`, `discharge_foul`, `abdominal_pain_severe`, `wound_red_or_oozing`, `breast_red_painful`, `calf_pain_swelling`, `breathless`, `chest_pain`, `fits`, `unconscious`, `dizziness_fainting`, `stopped_bp_medicine`, `stopped_iron`

**Baby:** `not_feeding`, `feeding_poor`, `fits`, `breathing_fast`, `breaths_per_minute`, `chest_indrawing`, `feels_hot`, `feels_cold`, `lethargic`, `jaundice_palms_soles`, `jaundice_face_body`, `cord_red_or_pus`, `vomiting_everything`, `wet_nappies_count`, `weight_grams`

---

## 2. Core data models (as returned by the API)

```jsonc
// Mother
{
  "id": "m_001",
  "name": "Lakshmi",
  "phone": "+919800000001",
  "family_phones": [{"name": "Ravi", "relation": "husband", "phone": "+919800000002", "decision_maker": true}],
  "language": "kn",                       // kn | hi | en
  "delivery_date": "2026-11-08",
  "delivery_type": "c_section",
  "complications": ["high_bp_in_pregnancy"],
  "risk_profile": "high",                 // standard | high
  "asha_id": "a_001",
  "consent_at": "2026-11-09T05:30:00Z",
  "status": "red",                        // current Level (max of open tickets / latest assessment)
  "day_since_delivery": 5
}

// Baby
{
  "id": "b_001",
  "mother_id": "m_001",
  "name": null,
  "birth_weight_grams": 2600,
  "gestation_weeks": 38,
  "status": "amber"
}

// Entry (timeline item; append-only, hash-chained per mother)
{
  "id": "e_042",
  "mother_id": "m_001",
  "subject": "baby",
  "subject_id": "b_001",
  "kind": "symptom",
  "code": "feeding_poor",                 // Fact code, or null for notes
  "value": "not drinking milk since morning",
  "numeric_value": null,
  "unit": null,
  "quote": "magu haalu kudiyuttilla",
  "source": "mother_reported",
  "source_phone": "+919800000001",
  "interaction_id": "int_abc123",
  "created_at": "2026-11-13T09:12:00Z",
  "prev_hash": "9f1c…",
  "hash": "a83b…"
}

// Ticket
{
  "id": "t_007",
  "mother_id": "m_001",
  "subjects": ["mother", "baby"],
  "level": "red",
  "rule_ids": ["M-BLEED-01", "D-INF-01"],
  "state": "notified",
  "reason_text": "Heavy bleeding (pad soaked within an hour) + baby feeding poorly",
  "dismissed_by_family": false,
  "history": [{"at": "2026-11-13T09:13:00Z", "state": "open", "by": "system", "note": ""}],
  "next_escalation_at": "2026-11-13T09:23:00Z",
  "assigned_to": ["+919800000002", "asha:a_001"]
}

// Asha
{ "id": "a_001", "name": "Sunita", "phone": "+919800000009", "village": "Demo Village" }

// Facility
{
  "id": "f_003", "name": "District Hospital (demo)", "type": "government",
  "services": ["labour_room", "c_section", "blood_bank", "newborn_care", "phototherapy"],
  "lat": 12.97, "lng": 77.59, "phone": "+918000000000", "cost_band": "free", "open_24x7": true
}
```

### Hash chain (tamper-evident log)

`hash = sha256(prev_hash + canonical_json(entry_without_hash_fields))`, where `canonical_json` = keys sorted, no whitespace, UTF-8. The first entry of a mother uses `prev_hash = "GENESIS"`. Entries are never updated or deleted. A correction is a new entry with `kind: "note"` referencing the old entry id in `value`.

---

## 3. Extraction schema (Sarvam-105B Structured Output)

The backend calls Sarvam-105B with `response_format = {type: "json_schema", json_schema: {strict: true, schema: <below>}}`.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["facts", "dismissal_detected", "needs_clarification"],
  "properties": {
    "facts": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["subject", "code", "present", "value", "numeric_value", "unit", "quote", "confidence"],
        "properties": {
          "subject": {"type": "string", "enum": ["mother", "baby"]},
          "code": {"type": "string"},
          "present": {"type": "boolean"},
          "value": {"type": ["string", "null"]},
          "numeric_value": {"type": ["number", "null"]},
          "unit": {"type": ["string", "null"]},
          "quote": {"type": "string"},
          "confidence": {"type": "number"}
        }
      }
    },
    "dismissal_detected": {"type": "boolean"},
    "needs_clarification": {"type": "array", "items": {"type": "string"}}
  }
}
```

- `code` must be one of the fact codes in §1 (backend validates; unknown codes are dropped and logged).
- `present: false` records an explicit "no" (e.g. "no fever").
- `dismissal_detected: true` when the speaker plays down a symptom ("it's normal", "she's fine", "sab theek hai").
- Facts with `confidence < 0.6` go to `needs_clarification` and are **not** saved until confirmed.

---

## 4. Sarvam hooks and tools → backend

All Sarvam → backend requests carry header `Authorization: Bearer ${TOOL_SHARED_SECRET}`. Backend rejects anything else with `401`.
Sarvam call-context variables used: `@UserIdentifier` (caller/callee phone), `@CallTranscript` (transcript so far), `@InteractionID`.

### 4.1 `POST /hooks/on-start` (on_start hook; no LLM)

Request:
```json
{ "phone": "+919800000001", "interaction_id": "int_abc123", "direction": "outbound" }
```
Response (mapped into agent input variables; keep values short strings):
```json
{
  "caller_role": "mother",
  "call_purpose": "checkin",
  "language": "kn",
  "mother_name": "Lakshmi",
  "day_since_delivery": "5",
  "delivery_type": "c_section",
  "baby_age_days": "5",
  "focus_topics": "bleeding, headache, stitches; baby feeding, jaundice (day 3-5)",
  "last_summary": "Day 4: mild headache, baby feeding well.",
  "open_ticket": "none",
  "asha_patient_list": ""
}
```
For `caller_role = "asha"`, `asha_patient_list` contains a short spoken list ("1. Lakshmi – red – bleeding. 2. Kavya – amber – missed calls.").
For `caller_role = "unknown"`: `mother_name` is empty and the agent may only take information (see access rules).

### 4.2 `POST /tools/assess-risk` (mid-call; must respond in under 8 s)

Request:
```json
{ "phone": "+919800000001", "interaction_id": "int_abc123", "transcript": "..." }
```
Response:
```json
{
  "level": "red",
  "rule_ids": ["M-BLEED-01"],
  "say_verbatim": "<fixed red script text in call language, from docs/red-scripts.md>",
  "transfer_to": "+919800000002",
  "clarify_question": null,
  "ticket_id": "t_007"
}
```
- `level = "green"`: `say_verbatim` is null; agent continues normally.
- `level = "amber"`: `say_verbatim` contains the amber script; no transfer.
- `level = "red"`: agent reads `say_verbatim` **word for word**, then transfers to `transfer_to` if not null.
- `clarify_question` non-null: agent asks exactly that question, then calls the tool again.

### 4.3 `POST /tools/read-summary`

Request: `{ "caller_phone": "+919800000001", "interaction_id": "int_x" }`
Response: `{ "allowed": true, "summary_text": "Lakshmi, day 5 after C-section on 8 November. BP 150/100 on day 4. On labetalol. Baby 2.6 kg at birth, mild jaundice day 4, feeding well today. No open alerts." }`
`allowed: false` returns `summary_text: "I can only share this with the mother, her family or her ASHA."`

### 4.4 `POST /tools/record-update` (ASHA / doctor / family adds information)

Request: `{ "caller_phone": "+919800000009", "interaction_id": "int_y", "transcript": "...", "about_mother_phone": null }`
Response: `{ "pending_id": "p_12", "readback_text": "I heard: Lakshmi, BP 150 over 100, baby weight 2.8 kilograms. Shall I save this?" }`

### 4.5 `POST /tools/confirm-update`

Request: `{ "pending_id": "p_12", "confirmed": true }`
Response: `{ "saved": true, "entry_ids": ["e_050", "e_051"], "say": "Saved. Thank you." }`

### 4.6 `POST /tools/onboarding-save` / `confirm` reuse 4.4/4.5 shapes

`POST /tools/onboarding-save` request: `{ "phone": "...", "interaction_id": "...", "transcript": "..." }`, response same as 4.4 (`readback_text` lists delivery date, type, baby weight, medicines, family contact). Confirmation uses `POST /tools/confirm-update`.

### 4.7 `POST /tools/find-facility`

Request: `{ "mother_phone": "...", "need": "routine_checkup" | "phototherapy" | "emergency", "interaction_id": "..." }`
Response: `{ "facility_id": "f_003", "say_text": "District Hospital, 6 kilometres away, open 24 hours.", "distance_km": 6.1 }`
For `need = "emergency"` the backend returns the nearest capable **government** facility and ignores cost.

### 4.8 `POST /hooks/on-end` (on_end hook / post-call webhook)

Request:
```json
{
  "phone": "+919800000001",
  "interaction_id": "int_abc123",
  "transcript": "...",
  "duration_seconds": 142,
  "variables": { "call_outcome": "completed" },
  "answered": true
}
```
Response: `{ "ok": true }`. Backend runs full extraction, saves entries (source by caller role), updates status, schedules next call, and creates/updates tickets. Must be idempotent per `interaction_id`.

---

## 5. Backend → Sarvam (outbound calls)

Backend triggers single calls via Sarvam **Instant Outbound** (`https://apps.sarvam.ai/api/outbounds`, header `X-API-Key`, path scoped `/v1/orgs/{org_id}/workspaces/{workspace_id}/...`). The exact route and body must be copied from the dashboard **Deploy → Deploy with Code** recipes. Wrap it in one function `place_call(phone, purpose, variables) -> interaction_id` so the rest of the code never depends on the raw API.

---

## 6. Frontend ↔ backend REST API

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | `/api/health` | liveness | `{ "ok": true }` |
| GET | `/api/mothers` | list with status | `Mother[]` |
| GET | `/api/mothers/{id}` | one mother + baby | `{ "mother": Mother, "baby": Baby }` |
| GET | `/api/mothers/{id}/timeline?since=<iso>` | entries, newest first | `Entry[]` |
| GET | `/api/mothers/{id}/audit` | verify hash chain | `{ "valid": true, "entries": 42, "broken_at": null }` |
| GET | `/api/tickets?state=open` | open tickets | `Ticket[]` |
| POST | `/api/tickets/{id}/ack` | `{ "by": "+91…", "note": "" }` | `Ticket` |
| POST | `/api/tickets/{id}/reached` | `{ "by": "asha:a_001", "note": "" }` | `Ticket` |
| GET | `/api/asha/{id}/list` | priority list | `[{ "mother": Mother, "baby": Baby, "priority": 1, "reason": "…" }]` |
| POST | `/api/onboarding/photo` | multipart `file`, `phone` | `{ "job_id": "…", "fields": {…} \| null, "status": "pending\|done" }` |
| GET | `/api/onboarding/photo/{job_id}` | poll Document AI result | same as above |
| POST | `/api/calls` | `{ "mother_id": "m_001", "purpose": "checkin" }` | `{ "interaction_id": "…" }` |
| GET | `/api/calls/recent` | last 20 calls | `[{ "interaction_id", "mother_id", "purpose", "started_at", "answered", "summary" }]` |
| POST | `/api/demo/reset` | wipe + seed demo data | `{ "ok": true }` |
| POST | `/api/demo/advance-day` | `{ "mother_id": "m_001", "days": 1 }` | `Mother` |
| POST | `/api/demo/inject` | `{ "mother_id": "m_001", "caller_phone": "+91…", "transcript": "…" }`; runs the same pipeline as `/hooks/on-end` (fallback if a live call fails) | `{ "ok": true, "level": "red" }` |

Polling: frontend polls `/api/mothers`, `/api/tickets?state=open` and the active timeline every 2 seconds. CORS allows `http://localhost:5173`.

### Onboarding photo `fields` shape
```json
{
  "delivery_date": "2026-11-08",
  "delivery_type": "c_section",
  "complications": ["high_bp_in_pregnancy"],
  "baby_birth_weight_grams": 2600,
  "gestation_weeks": 38,
  "medicines": [{"name": "Labetalol", "dose": "100 mg", "frequency": "twice daily"}],
  "confidence": {"delivery_date": 0.93, "baby_birth_weight_grams": 0.71}
}
```
Fields are saved with `source: "document_extracted"` only after voice read-back confirmation.

---

## 7. Access rules (enforced by backend)

| Caller | Hear history (`read-summary`) | Add information (`record-update`) |
|---|---|---|
| Mother's registered phone | ✅ (also when handed to a doctor; doctor notes saved as `doctor_verified` only if caller says "doctor" and confirms name) | ✅ `mother_reported` / `doctor_verified` |
| Registered family phone | ✅ (status + instructions only) | ✅ `family_reported` |
| Registered ASHA of that mother | ✅ | ✅ `asha_measured` |
| Unknown number | ❌ | ✅ saved as `family_reported` with `source_phone` and flagged `unverified_caller` |

Every read is written to an access log (`who`, `when`, `mother_id`, `interaction_id`).

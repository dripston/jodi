import { z } from 'zod';

/** Mirrors docs/contracts.md §1, §2, §6 and §6.1. Parse every response at the boundary. */

export const SubjectSchema = z.enum(['mother', 'baby']);
export const LevelSchema = z.enum(['green', 'amber', 'red']);
export const SourceSchema = z.enum([
  'mother_reported',
  'family_reported',
  'asha_measured',
  'doctor_verified',
  'document_extracted',
  'system',
]);
export const EntryKindSchema = z.enum([
  'symptom',
  'vital',
  'medicine',
  'note',
  'visit',
  'call',
  'onboarding',
]);
export const CallPurposeSchema = z.enum([
  'onboarding',
  'checkin',
  'inbound',
  'asha',
  'doctor',
  'family_alert',
]);
export const TicketStateSchema = z.enum(['open', 'notified', 'acknowledged', 'reached', 'closed']);
export const DeliveryTypeSchema = z.enum(['normal', 'c_section', 'assisted']);
export const CallOutcomeSchema = z.enum([
  'completed',
  'red_flag',
  'amber_flag',
  'no_answer',
  'wrong_person',
]);

export const FamilyPhoneSchema = z.object({
  name: z.string(),
  relation: z.string(),
  phone: z.string(),
  decision_maker: z.boolean(),
});

export const BabySchema = z.object({
  id: z.string(),
  mother_id: z.string(),
  name: z.string().nullable(),
  birth_weight_grams: z.number().nullable(),
  gestation_weeks: z.number().nullable(),
  status: LevelSchema,
});

export const MotherSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  family_phones: z.array(FamilyPhoneSchema),
  language: z.string(),
  delivery_date: z.string(),
  delivery_type: DeliveryTypeSchema,
  complications: z.array(z.string()),
  risk_profile: z.enum(['standard', 'high']),
  asha_id: z.string().nullable(),
  consent_at: z.string().nullable(),
  status: LevelSchema,
  day_since_delivery: z.number(),
  // §6.1 list enrichments (optional)
  baby: BabySchema.optional(),
  last_checkin_at: z.string().nullish(),
  next_call_at: z.string().nullish(),
});

export const MotherDetailSchema = z.object({ mother: MotherSchema, baby: BabySchema });

export const EntrySchema = z.object({
  id: z.string(),
  mother_id: z.string(),
  subject: SubjectSchema,
  subject_id: z.string(),
  kind: EntryKindSchema,
  code: z.string().nullable(),
  value: z.string().nullable(),
  numeric_value: z.number().nullable(),
  unit: z.string().nullable(),
  quote: z.string().nullable(),
  source: SourceSchema,
  source_phone: z.string().nullable(),
  interaction_id: z.string().nullable(),
  created_at: z.string(),
  prev_hash: z.string(),
  hash: z.string(),
  // Not in the contract yet; requested in docs/requests.md. Absent = no rule chip.
  rule_ids: z.array(z.string()).optional(),
});

export const TicketHistoryItemSchema = z.object({
  at: z.string(),
  state: TicketStateSchema,
  by: z.string(),
  note: z.string(),
});

export const TicketSchema = z.object({
  id: z.string(),
  mother_id: z.string(),
  subjects: z.array(SubjectSchema),
  level: LevelSchema,
  rule_ids: z.array(z.string()),
  state: TicketStateSchema,
  reason_text: z.string(),
  dismissed_by_family: z.boolean(),
  history: z.array(TicketHistoryItemSchema),
  next_escalation_at: z.string().nullable(),
  assigned_to: z.array(z.string()),
});

export const AshaSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  village: z.string(),
  open_tasks: z.number().optional(),
});

export const AuditSchema = z.object({
  valid: z.boolean(),
  entries: z.number(),
  broken_at: z.number().nullable(),
});

export const AshaListItemSchema = z.object({
  mother: MotherSchema,
  baby: BabySchema,
  priority: z.number(),
  reason: z.string(),
});

export const OnboardingFieldsSchema = z.object({
  delivery_date: z.string().nullish(),
  delivery_type: DeliveryTypeSchema.nullish(),
  complications: z.array(z.string()).nullish(),
  baby_birth_weight_grams: z.number().nullish(),
  gestation_weeks: z.number().nullish(),
  medicines: z
    .array(z.object({ name: z.string(), dose: z.string(), frequency: z.string() }))
    .nullish(),
  confidence: z.record(z.number()).default({}),
});

export const OnboardingJobSchema = z.object({
  job_id: z.string(),
  fields: OnboardingFieldsSchema.nullable(),
  status: z.enum(['pending', 'done']),
});

export const CallLogSchema = z.object({
  interaction_id: z.string(),
  mother_id: z.string(),
  purpose: CallPurposeSchema,
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
  started_at: z.string(),
  duration_seconds: z.number().default(0),
  answered: z.boolean(),
  outcome: CallOutcomeSchema.default('completed'),
  summary: z.string().nullable().default(null),
});

export const FactSchema = z.object({
  subject: SubjectSchema,
  code: z.string(),
  present: z.boolean(),
  value: z.string().nullable(),
  numeric_value: z.number().nullable(),
  unit: z.string().nullable(),
  quote: z.string(),
  confidence: z.number(),
});

export const CallDetailSchema = z.object({
  call: CallLogSchema,
  transcript: z.string(),
  facts: z.array(FactSchema),
  rule_ids: z.array(z.string()),
});

export const StatsSchema = z.object({
  mothers_enrolled: z.number(),
  active_dyads: z.number(),
  open_alerts: z.object({ red: z.number(), amber: z.number() }),
  median_minutes_to_contact: z.number().nullable(),
  asha_visit_within_24h_pct: z.number().nullable(),
  calls_today: z.object({ scheduled: z.number(), completed: z.number(), missed: z.number() }),
  asha_tasks_open: z.number(),
});

export const StatusByDaySchema = z.array(
  z.object({ day: z.number(), green: z.number(), amber: z.number(), red: z.number() }),
);

const VitalPoint = z.object({ at: z.string(), source: SourceSchema });
export const VitalsSchema = z.object({
  bp: z.array(VitalPoint.extend({ systolic: z.number(), diastolic: z.number() })),
  baby_weight: z.array(VitalPoint.extend({ grams: z.number() })),
  breaths_per_minute: z.array(VitalPoint.extend({ value: z.number() })),
});

export const SummarySchema = z.object({ summary_text: z.string() });
export const OkSchema = z.object({ ok: z.boolean() });
export const InjectResultSchema = z.object({ ok: z.boolean(), level: LevelSchema.nullish() });
export const CallStartedSchema = z.object({ interaction_id: z.string() });

/* ---------- care plan, hospitals, record sharing (contracts §8) ---------- */

export const PlannedCallSchema = z.object({
  id: z.string(),
  day: z.number().nullable(),
  due_at: z.string().nullable(),
  purpose: z.string(),
  reason: z.string(),
  status: z.string(),
});

export const FacilityOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  phone: z.string(),
  distance_km: z.number(),
  cost_band: z.string(),
  open_24x7: z.boolean(),
  availability: z.string(),
  services: z.array(z.string()),
  reasons: z.array(z.string()),
});
export const FacilityOptionsSchema = z.object({ need: z.string(), options: z.array(FacilityOptionSchema) });

export const ShareSchema = z.object({ url: z.string(), expires_at: z.string(), code_sent: z.boolean().default(true) });
export const ShareSessionSchema = z.object({ session: z.string(), expires_at: z.string() });

export const SharedRecordSchema = z.object({
  mother: z.object({
    name: z.string(),
    delivery_date: z.string().nullable(),
    delivery_type: z.string().nullable(),
    complications: z.array(z.string()),
    day_since_delivery: z.number().nullable(),
    status: z.string(),
    language: z.string(),
  }),
  baby: z.object({
    birth_weight_grams: z.number().nullable(),
    gestation_weeks: z.number().nullable(),
    status: z.string().nullable(),
  }),
  alert: z
    .object({ level: z.string(), reason: z.string(), rule_ids: z.array(z.string()), state: z.string() })
    .nullable(),
  danger_signs: z.array(
    z.object({ at: z.string(), what: z.string(), source: z.string(), subject: z.string(), rule_ids: z.array(z.string()) }),
  ),
  medicines: z.array(z.object({ at: z.string(), what: z.string().nullable() })),
  vitals: VitalsSchema,
  record_verified: z.boolean(),
  entries: z.number(),
  generated_at: z.string().nullable(),
});

export interface FamilyInput {
  name: string;
  relation: string;
  phone: string;
  decision_maker: boolean;
}

export interface RegisterInput {
  phone: string;
  name: string;
  language: string;
  asha_id?: string;
  delivery_date?: string;
  delivery_type?: string;
  family: FamilyInput[];
}

export type PlannedCall = z.infer<typeof PlannedCallSchema>;
export type FacilityOption = z.infer<typeof FacilityOptionSchema>;
export type FacilityOptions = z.infer<typeof FacilityOptionsSchema>;
export type SharedRecord = z.infer<typeof SharedRecordSchema>;

export type Subject = z.infer<typeof SubjectSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type EntryKind = z.infer<typeof EntryKindSchema>;
export type CallPurpose = z.infer<typeof CallPurposeSchema>;
export type TicketState = z.infer<typeof TicketStateSchema>;
export type DeliveryType = z.infer<typeof DeliveryTypeSchema>;
export type CallOutcome = z.infer<typeof CallOutcomeSchema>;
export type Mother = z.infer<typeof MotherSchema>;
export type Baby = z.infer<typeof BabySchema>;
export type MotherDetail = z.infer<typeof MotherDetailSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type Asha = z.infer<typeof AshaSchema>;
export type Audit = z.infer<typeof AuditSchema>;
export type AshaListItem = z.infer<typeof AshaListItemSchema>;
export type OnboardingFields = z.infer<typeof OnboardingFieldsSchema>;
export type OnboardingJob = z.infer<typeof OnboardingJobSchema>;
export type CallLog = z.infer<typeof CallLogSchema>;
export type Fact = z.infer<typeof FactSchema>;
export type CallDetail = z.infer<typeof CallDetailSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type StatusByDay = z.infer<typeof StatusByDaySchema>;
export type Vitals = z.infer<typeof VitalsSchema>;
export type InjectResult = z.infer<typeof InjectResultSchema>;

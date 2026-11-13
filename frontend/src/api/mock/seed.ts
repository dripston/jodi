import type { Asha, Baby, CallLog, Entry, Level, Mother, Source, Subject, Ticket } from '../schemas';

/** Synthetic demo data only. Names and numbers are fictional. */

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const iso = (msAgo: number, now = Date.now()) => new Date(now - msAgo).toISOString();
const dateOnly = (daysAgo: number) => iso(daysAgo * DAY).slice(0, 10);

export const ASHAS: Asha[] = [
  { id: 'a_001', name: 'Sunita', phone: '+919800000009', village: 'Hosahalli' },
  { id: 'a_002', name: 'Geetha', phone: '+919800000019', village: 'Kempapura' },
];

type MotherSeed = Omit<Mother, 'delivery_date' | 'status' | 'baby'>;

const MOTHERS: MotherSeed[] = [
  {
    id: 'm_001', name: 'Lakshmi', phone: '+919800000001', language: 'kn',
    family_phones: [{ name: 'Ravi', relation: 'husband', phone: '+919800000002', decision_maker: true }],
    delivery_type: 'c_section', complications: ['high_bp_in_pregnancy'], risk_profile: 'high',
    asha_id: 'a_001', consent_at: iso(4 * DAY), day_since_delivery: 5,
  },
  {
    id: 'm_002', name: 'Kavya', phone: '+919800000011', language: 'kn',
    family_phones: [{ name: 'Manjula', relation: 'mother_in_law', phone: '+919800000012', decision_maker: true }],
    delivery_type: 'normal', complications: [], risk_profile: 'standard',
    asha_id: 'a_001', consent_at: iso(11 * DAY), day_since_delivery: 12,
  },
  {
    id: 'm_003', name: 'Priya', phone: '+919800000021', language: 'en',
    family_phones: [{ name: 'Arjun', relation: 'husband', phone: '+919800000022', decision_maker: true }],
    delivery_type: 'normal', complications: [], risk_profile: 'standard',
    asha_id: 'a_002', consent_at: iso(1 * DAY), day_since_delivery: 2,
  },
  {
    id: 'm_004', name: 'Fathima', phone: '+919800000031', language: 'hi',
    family_phones: [{ name: 'Imran', relation: 'husband', phone: '+919800000032', decision_maker: true }],
    delivery_type: 'assisted', complications: ['anaemia'], risk_profile: 'high',
    asha_id: 'a_001', consent_at: iso(3 * DAY), day_since_delivery: 4,
  },
  {
    id: 'm_005', name: 'Meena', phone: '+919800000041', language: 'kn',
    family_phones: [{ name: 'Suresh', relation: 'husband', phone: '+919800000042', decision_maker: true }],
    delivery_type: 'normal', complications: [], risk_profile: 'standard',
    asha_id: 'a_002', consent_at: iso(20 * DAY), day_since_delivery: 21,
  },
];

const BABIES: Omit<Baby, 'status'>[] = [
  { id: 'b_001', mother_id: 'm_001', name: null, birth_weight_grams: 2600, gestation_weeks: 38 },
  { id: 'b_002', mother_id: 'm_002', name: 'Anika', birth_weight_grams: 3100, gestation_weeks: 39 },
  { id: 'b_003', mother_id: 'm_003', name: null, birth_weight_grams: 2950, gestation_weeks: 40 },
  { id: 'b_004', mother_id: 'm_004', name: null, birth_weight_grams: 2350, gestation_weeks: 36 },
  { id: 'b_005', mother_id: 'm_005', name: 'Dhruv', birth_weight_grams: 3300, gestation_weeks: 39 },
];

export interface EntrySeed {
  m: string; subject: Subject; kind: Entry['kind']; code: string | null; value: string | null;
  num?: number; unit?: string; quote?: string; source: Source; ago: number; rules?: string[];
}

const L = '+919800000001';
export const ENTRY_SEEDS: EntrySeed[] = [
  { m: 'm_001', subject: 'mother', kind: 'onboarding', code: null, value: 'C-section on day 0, high BP in pregnancy', source: 'document_extracted', ago: 4 * DAY + 2 * HOUR },
  { m: 'm_001', subject: 'mother', kind: 'medicine', code: null, value: 'Labetalol 100 mg twice daily', source: 'document_extracted', ago: 4 * DAY + 2 * HOUR },
  { m: 'm_001', subject: 'baby', kind: 'vital', code: 'weight_grams', value: 'Birth weight', num: 2600, unit: 'g', source: 'document_extracted', ago: 4 * DAY + 2 * HOUR },
  { m: 'm_001', subject: 'mother', kind: 'call', code: null, value: 'Onboarding call: details confirmed by mother', quote: 'haudu, sari ide', source: 'mother_reported', ago: 4 * DAY + HOUR },
  { m: 'm_001', subject: 'mother', kind: 'vital', code: 'bp_systolic', value: 'BP 138/88', num: 138, unit: 'mmHg', source: 'asha_measured', ago: 3 * DAY },
  { m: 'm_001', subject: 'baby', kind: 'note', code: null, value: 'Baby feeding well', quote: 'chennagi kudiyuttide', source: 'mother_reported', ago: 3 * DAY - HOUR },
  { m: 'm_001', subject: 'mother', kind: 'note', code: null, value: 'Mild headache, not severe', quote: 'swalpa tale novu', source: 'mother_reported', ago: DAY + 3 * HOUR },
  { m: 'm_001', subject: 'baby', kind: 'symptom', code: 'jaundice_face_body', value: 'Slight yellow on face', quote: 'mukha swalpa haladi', source: 'family_reported', ago: DAY + 2 * HOUR, rules: ['B-JAUN-03'] },
  { m: 'm_001', subject: 'mother', kind: 'symptom', code: 'pads_soaked_count', value: '4 pads since morning', num: 4, quote: 'naalku batte since morning', source: 'mother_reported', ago: 38 * MIN, rules: ['M-BLEED-02'] },
  { m: 'm_001', subject: 'mother', kind: 'symptom', code: 'headache_severe', value: 'Heavy head', quote: 'tale bhaara', source: 'mother_reported', ago: 38 * MIN, rules: ['M-HTN-05'] },
  { m: 'm_001', subject: 'baby', kind: 'symptom', code: 'feeding_poor', value: 'Drinking less milk since morning', quote: 'magu haalu kammi kudiyuttide', source: 'mother_reported', ago: 37 * MIN, rules: ['B-FEED-02'] },
  { m: 'm_001', subject: 'mother', kind: 'symptom', code: 'pad_soaked_within_hour', value: 'Pad soaked within an hour', quote: 'ondu ganteyalli batte poorti', source: 'mother_reported', ago: 36 * MIN, rules: ['M-BLEED-01'] },
  { m: 'm_001', subject: 'mother', kind: 'note', code: null, value: 'Husband said it is normal after delivery. Ticket kept open.', quote: 'Delivery aadmele heege, normal', source: 'family_reported', ago: 30 * MIN, rules: ['X-DISMISS-01'] },
  { m: 'm_002', subject: 'mother', kind: 'onboarding', code: null, value: 'Normal delivery, no complications', source: 'document_extracted', ago: 11 * DAY },
  { m: 'm_002', subject: 'baby', kind: 'vital', code: 'weight_grams', value: 'Weight at day 7', num: 3150, unit: 'g', source: 'asha_measured', ago: 5 * DAY },
  { m: 'm_002', subject: 'mother', kind: 'call', code: null, value: 'Check-in call not answered (2nd in a row)', source: 'system', ago: 6 * HOUR, rules: ['H-MISSED-01'] },
  { m: 'm_003', subject: 'mother', kind: 'onboarding', code: null, value: 'Normal delivery, mother and baby well', source: 'document_extracted', ago: DAY + 4 * HOUR },
  { m: 'm_003', subject: 'baby', kind: 'note', code: null, value: 'Baby feeding well, 8 times today', quote: 'feeding every two hours', source: 'mother_reported', ago: 3 * HOUR },
  { m: 'm_004', subject: 'mother', kind: 'onboarding', code: null, value: 'Assisted delivery at 36 weeks, anaemia', source: 'document_extracted', ago: 3 * DAY },
  { m: 'm_004', subject: 'baby', kind: 'symptom', code: 'jaundice_face_body', value: 'Yellow on face and chest', quote: 'chehra peela lag raha hai', source: 'mother_reported', ago: 5 * HOUR, rules: ['B-JAUN-03'] },
  { m: 'm_004', subject: 'mother', kind: 'medicine', code: null, value: 'Iron and folic acid restarted', source: 'doctor_verified', ago: 2 * HOUR },
  { m: 'm_005', subject: 'mother', kind: 'onboarding', code: null, value: 'Normal delivery', source: 'document_extracted', ago: 20 * DAY },
  { m: 'm_005', subject: 'mother', kind: 'vital', code: 'bp_systolic', value: 'BP 118/76', num: 118, unit: 'mmHg', source: 'asha_measured', ago: 2 * DAY },
];
export const LAKSHMI_PHONE = L;

export function seedMothers(): { mothers: Mother[]; babies: Baby[] } {
  const status: Record<string, [Level, Level]> = {
    m_001: ['red', 'amber'], m_002: ['amber', 'green'], m_003: ['green', 'green'],
    m_004: ['green', 'amber'], m_005: ['green', 'green'],
  };
  const mothers = MOTHERS.map((m) => ({
    ...m,
    delivery_date: dateOnly(m.day_since_delivery),
    status: status[m.id]?.[0] ?? 'green',
    last_checkin_at: iso(m.id === 'm_001' ? 38 * MIN : 5 * HOUR),
    next_call_at: iso(-(m.id === 'm_001' ? 2 * HOUR : 18 * HOUR)),
  }));
  const babies = BABIES.map((b) => ({ ...b, status: status[b.mother_id]?.[1] ?? 'green' }));
  return { mothers, babies };
}

export function seedTickets(): Ticket[] {
  return [
    {
      id: 't_007', mother_id: 'm_001', subjects: ['mother', 'baby'], level: 'red',
      rule_ids: ['M-BLEED-01', 'M-HTN-05', 'B-FEED-02'], state: 'notified',
      reason_text: 'Pad soaked within an hour, heavy head, and baby drinking less milk',
      dismissed_by_family: true,
      history: [
        { at: iso(36 * MIN), state: 'open', by: 'system', note: '' },
        { at: iso(35 * MIN), state: 'notified', by: 'system', note: 'Called Ravi (husband) and alerted ASHA Sunita' },
      ],
      next_escalation_at: iso(-(6 * MIN + 42_000)),
      assigned_to: ['+919800000002', 'asha:a_001'],
    },
    {
      id: 't_008', mother_id: 'm_002', subjects: ['mother'], level: 'amber', rule_ids: ['H-MISSED-01'],
      state: 'acknowledged', reason_text: 'Two check-in calls in a row were not answered',
      dismissed_by_family: false,
      history: [
        { at: iso(6 * HOUR), state: 'open', by: 'system', note: '' },
        { at: iso(6 * HOUR - MIN), state: 'notified', by: 'system', note: '' },
        { at: iso(5 * HOUR), state: 'acknowledged', by: 'asha:a_001', note: 'Will visit this evening' },
      ],
      next_escalation_at: iso(-(40 * MIN)),
      assigned_to: ['+919800000012', 'asha:a_001'],
    },
    {
      id: 't_005', mother_id: 'm_004', subjects: ['baby'], level: 'amber', rule_ids: ['B-JAUN-03'],
      state: 'closed', reason_text: 'Yellow on face and body after the first day',
      dismissed_by_family: false,
      history: [
        { at: iso(5 * HOUR), state: 'open', by: 'system', note: '' },
        { at: iso(4 * HOUR), state: 'reached', by: 'asha:a_001', note: 'Seen at PHC, sunlight advice' },
        { at: iso(3 * HOUR), state: 'closed', by: 'system', note: 'Follow-up assessment amber, not red' },
      ],
      next_escalation_at: null,
      assigned_to: ['asha:a_001'],
    },
  ];
}

export function seedCalls(): CallLog[] {
  const c = (id: string, m: string, purpose: CallLog['purpose'], ago: number, dur: number,
    outcome: CallLog['outcome'], summary: string, direction: CallLog['direction'] = 'outbound'): CallLog => ({
    interaction_id: id, mother_id: m, purpose, direction, started_at: iso(ago), duration_seconds: dur,
    answered: outcome !== 'no_answer', outcome, summary,
  });
  return [
    c('int_010', 'm_001', 'family_alert', 34 * MIN, 96, 'red_flag', 'Ravi told about danger signs; said it is normal. Ticket kept open.'),
    c('int_009', 'm_001', 'checkin', 39 * MIN, 184, 'red_flag', 'Pad soaked within an hour, heavy head; baby drinking less milk.'),
    c('int_008', 'm_003', 'checkin', 3 * HOUR, 142, 'completed', 'Mother and baby well. Feeding every two hours.'),
    c('int_007', 'm_004', 'doctor', 2 * HOUR, 210, 'completed', 'Doctor restarted iron and folic acid.', 'inbound'),
    c('int_006', 'm_004', 'checkin', 5 * HOUR, 156, 'amber_flag', 'Baby yellow on face and chest.'),
    c('int_005', 'm_002', 'checkin', 6 * HOUR, 0, 'no_answer', 'No answer after retry.'),
    c('int_004', 'm_002', 'checkin', 30 * HOUR, 0, 'no_answer', 'No answer.'),
    c('int_003', 'm_001', 'asha', 3 * DAY, 120, 'completed', 'ASHA Sunita measured BP 138/88.', 'inbound'),
    c('int_002', 'm_001', 'onboarding', 4 * DAY + HOUR, 305, 'completed', 'Details read back and confirmed by mother.'),
    c('int_001', 'm_005', 'checkin', 2 * DAY, 98, 'completed', 'Day 19 check-in. All well.'),
    c('int_000', 'm_003', 'onboarding', DAY + 4 * HOUR, 260, 'wrong_person', 'Neighbour answered; callback scheduled.'),
  ];
}

export const TRANSCRIPTS: Record<string, string> = {
  int_009: 'Jodi: Namaskara Lakshmi, how are you today?\nLakshmi: naalku batte since morning… ondu ganteyalli batte poorti. tale bhaara.\nJodi: And the baby?\nLakshmi: magu haalu kammi kudiyuttide.',
  int_010: 'Jodi: Ravi, Lakshmi has danger signs and needs care now.\nRavi: Delivery aadmele heege, normal.\nJodi: Bleeding like this is not normal. Please take her to the hospital now.',
};

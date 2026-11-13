import type { Level, Mother, Source, Subject, Ticket } from '../schemas';
import { iso, MIN } from './seed';
import { appendEntry, LEVEL_RANK, maxLevel, type MockState } from './store';

/**
 * Mock stand-in for the backend's on-end pipeline (extraction + rules + tickets).
 * Keyword matching only; levels follow the rule table in docs/clinical-rules.md.
 */

interface MockFact {
  subject: Subject; code: string; value: string; quote: string;
  num?: number; unit?: string; kind: 'symptom' | 'vital'; rule?: string; level?: Level;
}

const PATTERNS: { re: RegExp; fact: (m: RegExpMatchArray) => MockFact }[] = [
  { re: /(naalku|four|4) (batte|pads?|cloths?)/i, fact: (m) => ({ subject: 'mother', code: 'pads_soaked_count', value: '4 pads since morning', quote: m[0], num: 4, kind: 'symptom', rule: 'M-BLEED-02', level: 'amber' }) },
  { re: /(ondu ganteyalli|within an hour)/i, fact: (m) => ({ subject: 'mother', code: 'pad_soaked_within_hour', value: 'Pad soaked within an hour', quote: m[0], kind: 'symptom', rule: 'M-BLEED-01', level: 'red' }) },
  { re: /(tale bhaara|tale novu|headache)/i, fact: (m) => ({ subject: 'mother', code: 'headache_severe', value: 'Heavy head', quote: m[0], kind: 'symptom', rule: 'M-HTN-05', level: 'amber' }) },
  { re: /(haalu kammi|not drinking milk|drinking less)/i, fact: (m) => ({ subject: 'baby', code: 'feeding_poor', value: 'Drinking less milk', quote: m[0], kind: 'symptom', rule: 'B-FEED-02', level: 'amber' }) },
  { re: /(jwara|fever)/i, fact: (m) => ({ subject: 'mother', code: 'fever', value: 'Fever', quote: m[0], kind: 'symptom', rule: 'M-FEVER-01', level: 'amber' }) },
  { re: /BP (\d{2,3}) (?:over|\/) (\d{2,3})/i, fact: (m) => ({ subject: 'mother', code: 'bp_systolic', value: `BP ${m[1]}/${m[2]}`, quote: m[0], num: Number(m[1]), unit: 'mmHg', kind: 'vital', ...bpRule(Number(m[1]), Number(m[2])) }) },
  { re: /(\d(?:\.\d)?) ?kg/i, fact: (m) => ({ subject: 'baby', code: 'weight_grams', value: `Weight ${m[1]} kg`, quote: m[0], num: Math.round(Number(m[1]) * 1000), unit: 'g', kind: 'vital' }) },
];

function bpRule(sys: number, dia: number): Pick<MockFact, 'rule' | 'level'> {
  if (sys >= 160 || dia >= 110) return { rule: 'M-HTN-02', level: 'red' };
  if (sys >= 140 || dia >= 90) return { rule: 'M-HTN-04', level: 'amber' };
  return {};
}

const DISMISSAL = /(normal|she'?s fine|sab theek|parvagilla)/i;
const REACHED = /(going to|taken to|reached) (the )?(district )?hospital|PHC/i;
const DOCTOR = /(doctor|started|prescribed)/i;

function sourceFor(state: MockState, mother: Mother, phone: string, transcript: string): Source {
  if (state.mothers.some((m) => m.id === mother.id && m.phone === phone)) {
    return DOCTOR.test(transcript) && !PATTERNS[0]?.re.test(transcript) ? 'doctor_verified' : 'mother_reported';
  }
  if (phone === '+919800000009' || phone === '+919800000019') return 'asha_measured';
  return 'family_reported';
}

export function runPipeline(state: MockState, motherId: string, phone: string, transcript: string): Level {
  const mother = state.mothers.find((m) => m.id === motherId);
  const baby = state.babies.find((b) => b.mother_id === motherId);
  if (!mother || !baby) return 'green';
  const source = sourceFor(state, mother, phone, transcript);
  const interactionId = `int_${Date.now().toString(36)}`;
  const facts = PATTERNS.flatMap(({ re, fact }) => {
    const m = transcript.match(re);
    return m ? [fact(m)] : [];
  });

  for (const f of facts) {
    appendEntry(state, {
      mother_id: motherId, subject: f.subject, subject_id: f.subject === 'mother' ? mother.id : baby.id,
      kind: f.kind, code: f.code, value: f.value, numeric_value: f.num ?? null, unit: f.unit ?? null,
      quote: f.quote, source, source_phone: phone, interaction_id: interactionId,
      created_at: new Date().toISOString(), rule_ids: f.rule ? [f.rule] : undefined,
    });
  }
  if (source === 'doctor_verified') {
    appendEntry(state, {
      mother_id: motherId, subject: 'mother', subject_id: mother.id, kind: 'medicine', code: null,
      value: transcript.replace(/^.*?(started|prescribed)/i, 'Started').slice(0, 80), numeric_value: null,
      unit: null, quote: null, source, source_phone: phone, interaction_id: interactionId,
      created_at: new Date().toISOString(),
    });
  }

  const motherLevel = maxLevel(facts.filter((f) => f.subject === 'mother').map((f) => f.level ?? 'green'));
  const babyLevel = maxLevel(facts.filter((f) => f.subject === 'baby').map((f) => f.level ?? 'green'));
  const level = maxLevel([motherLevel, babyLevel]);
  const ruleIds = facts.flatMap((f) => (f.rule && f.level ? [f.rule] : []));
  const open = state.tickets.find((t) => t.mother_id === motherId && t.state !== 'closed');
  const now = new Date().toISOString();

  if (open && DISMISSAL.test(transcript)) {
    open.dismissed_by_family = true;
    open.history.push({ at: now, state: open.state, by: phone, note: 'Family said it is normal; ticket kept open' });
  }
  if (open && source === 'asha_measured' && REACHED.test(transcript)) {
    open.state = 'reached';
    open.history.push({ at: now, state: 'reached', by: 'asha:a_001', note: 'Going to district hospital' });
  }
  if (LEVEL_RANK[level] > 0) {
    if (open) {
      open.level = maxLevel([open.level, level]);
      open.rule_ids = Array.from(new Set([...open.rule_ids, ...ruleIds]));
    } else {
      state.tickets.unshift(newTicket(state, motherId, level, ruleIds, facts, phone));
    }
  }
  mother.status = maxLevel([mother.status, motherLevel]);
  baby.status = maxLevel([baby.status, babyLevel]);
  mother.last_checkin_at = now;

  state.calls.unshift({
    interaction_id: interactionId, mother_id: motherId, purpose: source === 'asha_measured' ? 'asha' : source === 'doctor_verified' ? 'doctor' : 'checkin',
    direction: source === 'mother_reported' ? 'outbound' : 'inbound', started_at: now, duration_seconds: 120,
    answered: true, outcome: level === 'red' ? 'red_flag' : level === 'amber' ? 'amber_flag' : 'completed',
    summary: facts.map((f) => f.value).join('; ') || 'No new facts.',
  });
  state.transcripts[interactionId] = transcript;
  return level;
}

function newTicket(state: MockState, motherId: string, level: Level, ruleIds: string[], facts: MockFact[], phone: string): Ticket {
  state.seq += 1;
  const subjects = Array.from(new Set(facts.filter((f) => f.level).map((f) => f.subject)));
  return {
    id: `t_${String(100 + state.seq)}`, mother_id: motherId, subjects, level, rule_ids: ruleIds, state: 'notified',
    reason_text: facts.filter((f) => f.level).map((f) => f.value).join(', '), dismissed_by_family: false,
    history: [
      { at: new Date().toISOString(), state: 'open', by: 'system', note: '' },
      { at: new Date().toISOString(), state: 'notified', by: 'system', note: `Alerted family and ASHA (from ${phone})` },
    ],
    next_escalation_at: iso(-(level === 'red' ? 10 : 60) * MIN),
    assigned_to: ['asha:a_001'],
  };
}

/** Simulates the mother saying "haudu" on the onboarding call: slip fields become confirmed entries. */
export function confirmOnboarding(state: MockState, motherId: string, interactionId: string): void {
  const mother = state.mothers.find((m) => m.id === motherId);
  const baby = state.babies.find((b) => b.mother_id === motherId);
  if (!mother || !baby) return;
  const base = {
    mother_id: motherId, numeric_value: null, unit: null, quote: 'haudu', source: 'document_extracted' as const,
    source_phone: mother.phone, interaction_id: interactionId, created_at: new Date().toISOString(),
  };
  appendEntry(state, { ...base, subject: 'mother', subject_id: mother.id, kind: 'onboarding', code: null, value: 'C-section, high BP in pregnancy (confirmed by mother)' });
  appendEntry(state, { ...base, subject: 'mother', subject_id: mother.id, kind: 'medicine', code: null, value: 'Labetalol 100 mg twice daily' });
  appendEntry(state, { ...base, subject: 'baby', subject_id: baby.id, kind: 'vital', code: 'weight_grams', value: 'Birth weight', numeric_value: 2600, unit: 'g' });
  const call = state.calls.find((c) => c.interaction_id === interactionId);
  if (call) {
    call.duration_seconds = 214;
    call.summary = 'Details read back in Kannada and confirmed by mother.';
  }
}

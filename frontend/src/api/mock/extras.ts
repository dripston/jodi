import type { HttpMethod } from '../client';
import type { DeliveryType, Mother } from '../schemas';
import { DAY, iso } from './seed';
import { verifyChain, type MockState } from './store';

/** Mock versions of the newer endpoints: register, planned calls, hospitals, record sharing. */

const MOCK_CODE = '123456';
const shares: Record<string, string> = {}; // token → mother id

type Body = Record<string, unknown> | undefined;
const str = (b: unknown, k: string) => String((b as Body)?.[k] ?? '');

const MILESTONES = [3, 4, 5, 7, 14, 21, 28, 42];

const HOSPITALS = [
  { id: 'f_001', name: 'Vani Vilas Women and Children Hospital', type: 'government', km: 0.8, cost: 'free', beds: 'available' },
  { id: 'f_002', name: 'Bowring and Lady Curzon Hospital', type: 'government', km: 3.4, cost: 'free', beds: 'limited' },
  { id: 'f_010', name: 'Fortis La Femme, Richmond Road', type: 'private', km: 2.9, cost: 'high', beds: 'full' },
];
const COST = { free: 'free (government)', high: 'high cost' } as const;

function plannedCalls(m: Mother) {
  return MILESTONES.map((d) => ({
    id: `sc_${m.id}_${d}`,
    day: d,
    due_at: iso((m.day_since_delivery - d) * DAY + (m.day_since_delivery >= d ? 0 : -10 * 60 * 1000)),
    purpose: 'checkin',
    reason: 'milestone',
    status: d < m.day_since_delivery ? 'answered' : 'pending',
  }));
}

function facilities(state: MockState, m: Mother) {
  const red = state.tickets.some((t) => t.mother_id === m.id && t.level === 'red' && t.state !== 'closed');
  return {
    need: red ? 'emergency_mother' : 'routine_checkup',
    options: HOSPITALS.map((h) => ({
      id: h.id,
      name: h.name,
      type: h.type,
      phone: '',
      distance_km: h.km,
      cost_band: h.cost,
      open_24x7: true,
      availability: h.beds,
      services: ['blood_bank', 'c_section', 'newborn_care', 'postnatal_care'],
      reasons: [
        'Can treat: blood bank, C-section',
        `${h.km.toFixed(1)} km away`,
        COST[h.cost as keyof typeof COST],
        `beds: ${h.beds} (demo data)`,
        'open 24×7',
      ],
    })),
  };
}

function register(state: MockState, body: unknown) {
  const id = `m_${Date.now().toString(36)}`;
  const date = str(body, 'delivery_date') || iso(DAY).slice(0, 10);
  const day = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / DAY));
  const family = ((body as Body)?.family as Mother['family_phones'] | undefined) ?? [];
  const mother: Mother = {
    id,
    name: str(body, 'name'),
    phone: str(body, 'phone'),
    family_phones: family.map((f, i) => ({ ...f, decision_maker: i === 0 })),
    language: str(body, 'language') || 'kn',
    delivery_date: date,
    delivery_type: (str(body, 'delivery_type') || 'normal') as DeliveryType,
    complications: [],
    risk_profile: 'standard',
    asha_id: str(body, 'asha_id') || 'a_001',
    consent_at: null,
    status: 'green',
    day_since_delivery: day,
    next_call_at: iso(-DAY),
  };
  const baby = { id: `b_${id.slice(2)}`, mother_id: id, name: null, birth_weight_grams: null, gestation_weeks: null, status: 'green' as const };
  state.mothers.unshift(mother);
  state.babies.push(baby);
  return { mother, baby };
}

function sharedRecord(state: MockState, m: Mother) {
  const t = state.tickets.find((x) => x.mother_id === m.id && x.state !== 'closed');
  const signs = state.entries
    .filter((e) => e.mother_id === m.id && e.kind === 'symptom' && e.value && !e.value.startsWith('no '))
    .slice(-10)
    .reverse()
    .map((e) => ({ at: e.created_at, what: e.value ?? '', source: e.source, subject: e.subject, rule_ids: [] }));
  const baby = state.babies.find((b) => b.mother_id === m.id);
  const audit = verifyChain(state, m.id);
  return {
    mother: { name: m.name, delivery_date: m.delivery_date, delivery_type: m.delivery_type, complications: m.complications,
      day_since_delivery: m.day_since_delivery, status: m.status, language: m.language },
    baby: { birth_weight_grams: baby?.birth_weight_grams ?? null, gestation_weeks: baby?.gestation_weeks ?? null, status: baby?.status ?? null },
    alert: t ? { level: t.level, reason: t.reason_text, rule_ids: t.rule_ids, state: t.state } : null,
    danger_signs: signs,
    medicines: state.entries.filter((e) => e.mother_id === m.id && e.kind === 'medicine').map((e) => ({ at: e.created_at, what: e.value })),
    vitals: { bp: [], baby_weight: [], breaths_per_minute: [] },
    record_verified: audit.valid,
    entries: audit.entries,
    generated_at: new Date().toISOString(),
  };
}

/** Returns undefined when the path is not one of these endpoints. */
export function extraRoute(state: MockState, method: HttpMethod, url: URL, body: unknown): unknown {
  const seg = url.pathname.split('/').filter(Boolean);
  const mother = (id: string | undefined) => state.mothers.find((x) => x.id === id);
  const forbidden = () => {
    throw Object.assign(new Error('Mock 403'), { status: 403 });
  };

  if (method === 'GET' && seg[1] === 'mothers' && (seg[3] === 'planned-calls' || seg[3] === 'facilities')) {
    const m = mother(seg[2]);
    if (!m) return undefined;
    return seg[3] === 'planned-calls' ? plannedCalls(m) : facilities(state, m);
  }
  if (method === 'GET' && seg[1] === 'share' && seg[3] === 'record') {
    const m = mother(shares[seg[2] ?? '']);
    return m ? sharedRecord(state, m) : forbidden();
  }
  if (method === 'POST' && url.pathname === '/api/onboarding/register') return register(state, body);
  if (method === 'POST' && seg[1] === 'mothers' && seg[3] === 'share') {
    const token = `mock${Date.now().toString(36)}`;
    shares[token] = seg[2] ?? '';
    return { url: `${window.location.origin}/share/${token}`, expires_at: iso(-DAY), code_sent: true };
  }
  if (method === 'POST' && seg[1] === 'share' && seg[3] === 'verify') {
    return str(body, 'code') === MOCK_CODE ? { session: 'mock-session', expires_at: iso(-30 * 60 * 1000) } : forbidden();
  }
  if (method === 'POST' && seg[1] === 'share' && seg[3] === 'code') return { ok: true };
  return undefined;
}

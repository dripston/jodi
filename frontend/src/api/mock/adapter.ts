import type { HttpMethod } from '../client';
import type { Level, Mother } from '../schemas';
import { confirmOnboarding, runPipeline } from './pipeline';
import { DAY, HOUR, iso } from './seed';
import { createState, LEVEL_RANK, maxLevel, verifyChain, type MockState } from './store';

let state: MockState = createState();

export class MockHttpError extends Error {
  constructor(readonly status: number) {
    super(`Mock ${status}`);
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = <T>(v: T): T => structuredClone(v);

function withBaby(m: Mother): Mother {
  return { ...m, baby: state.babies.find((b) => b.mother_id === m.id) };
}

function filterMothers(params: URLSearchParams): Mother[] {
  const q = params.get('q')?.toLowerCase() ?? '';
  const dayMin = Number(params.get('day_min') ?? 0);
  const dayMax = Number(params.get('day_max') ?? 42);
  return state.mothers
    .filter((m) => !params.get('status') || m.status === params.get('status'))
    .filter((m) => !params.get('asha_id') || m.asha_id === params.get('asha_id'))
    .filter((m) => params.get('high_risk') !== 'true' || m.risk_profile === 'high')
    .filter((m) => m.day_since_delivery >= dayMin && m.day_since_delivery <= dayMax)
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.phone.endsWith(q))
    .map(withBaby);
}

function dyadLevel(m: Mother): Level {
  const baby = state.babies.find((b) => b.mother_id === m.id);
  return maxLevel([m.status, baby?.status ?? 'green']);
}

function ashaList(ashaId: string) {
  return state.mothers
    .filter((m) => m.asha_id === ashaId)
    .map((m) => {
      const ticket = state.tickets.find((t) => t.mother_id === m.id && t.state !== 'closed');
      return { m, level: dyadLevel(m), reason: ticket?.reason_text ?? 'Routine visit' };
    })
    .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || a.m.day_since_delivery - b.m.day_since_delivery)
    .map(({ m, reason }, i) => ({
      mother: m, baby: state.babies.find((b) => b.mother_id === m.id), priority: i + 1, reason,
    }));
}

function vitals(motherId: string) {
  const es = state.entries.filter((e) => e.mother_id === motherId && e.kind === 'vital');
  const bp = es.filter((e) => e.code === 'bp_systolic').map((e) => {
    const [sys, dia] = (e.value ?? '').replace(/[^\d/]/g, '').split('/').map(Number);
    return { at: e.created_at, systolic: sys ?? 0, diastolic: dia ?? 0, source: e.source };
  });
  const baby_weight = es.filter((e) => e.code === 'weight_grams')
    .map((e) => ({ at: e.created_at, grams: e.numeric_value ?? 0, source: e.source }));
  const breaths_per_minute = es.filter((e) => e.code === 'breaths_per_minute')
    .map((e) => ({ at: e.created_at, value: e.numeric_value ?? 0, source: e.source }));
  return { bp, baby_weight, breaths_per_minute };
}

function stats() {
  const open = state.tickets.filter((t) => t.state !== 'closed');
  return {
    mothers_enrolled: 123 + state.mothers.length,
    active_dyads: 91 + state.mothers.filter((m) => m.day_since_delivery <= 42).length,
    open_alerts: { red: open.filter((t) => t.level === 'red').length, amber: open.filter((t) => t.level === 'amber').length },
    median_minutes_to_contact: 6.5,
    asha_visit_within_24h_pct: 81,
    calls_today: { scheduled: 40, completed: 31, missed: 5 },
    asha_tasks_open: open.length + 7,
  };
}

function statusByDay() {
  return Array.from({ length: 43 }, (_, day) => {
    const base = Math.max(1, Math.round(4 - day / 14 + ((day * 7) % 3)));
    const own = state.mothers.filter((m) => m.day_since_delivery === day);
    const count = (l: Level) => own.filter((m) => dyadLevel(m) === l).length;
    return {
      day,
      green: base + count('green'),
      amber: (day % 5 === 2 ? 1 : 0) + count('amber'),
      red: (day === 3 ? 1 : 0) + count('red'),
    };
  });
}

function photoJob(jobId: string) {
  const job = state.photoJobs[jobId];
  if (!job) throw new MockHttpError(404);
  job.polls += 1;
  const done = job.polls >= 2;
  return {
    job_id: jobId,
    status: done ? 'done' : 'pending',
    fields: done
      ? {
          delivery_date: iso(0).slice(0, 10), delivery_type: 'c_section', complications: ['high_bp_in_pregnancy'],
          baby_birth_weight_grams: 2600, gestation_weeks: 38,
          medicines: [{ name: 'Labetalol', dose: '100 mg', frequency: 'twice daily' }],
          confidence: { delivery_date: 0.93, delivery_type: 0.97, complications: 0.82, baby_birth_weight_grams: 0.71, gestation_weeks: 0.88, medicines: 0.9 },
        }
      : null,
  };
}

type Body = Record<string, unknown>;
const str = (b: unknown, k: string) => (typeof b === 'object' && b && typeof (b as Body)[k] === 'string' ? String((b as Body)[k]) : '');

function route(method: HttpMethod, url: URL, body: unknown): unknown {
  const p = url.pathname;
  const seg = p.split('/').filter(Boolean);
  const mother = (id: string | undefined) => {
    const m = state.mothers.find((x) => x.id === id);
    if (!m) throw new MockHttpError(404);
    return m;
  };

  if (method === 'GET') {
    if (p === '/api/health') return { ok: true };
    if (p === '/api/mothers') return filterMothers(url.searchParams);
    if (seg[1] === 'mothers' && seg.length === 3) {
      const m = mother(seg[2]);
      return { mother: m, baby: state.babies.find((b) => b.mother_id === m.id) };
    }
    if (seg[1] === 'mothers' && seg[3] === 'timeline') {
      mother(seg[2]);
      return state.entries.filter((e) => e.mother_id === seg[2]).slice().reverse();
    }
    if (seg[1] === 'mothers' && seg[3] === 'audit') return verifyChain(state, mother(seg[2]).id);
    if (seg[1] === 'mothers' && seg[3] === 'vitals') return vitals(mother(seg[2]).id);
    if (seg[1] === 'mothers' && seg[3] === 'calls') return state.calls.filter((c) => c.mother_id === seg[2]);
    if (seg[1] === 'mothers' && seg[3] === 'summary') {
      const m = mother(seg[2]);
      return { summary_text: `${m.name}, day ${m.day_since_delivery} after C-section. BP 138/88 on day 2, measured by ASHA. On labetalol 100 mg twice daily. Baby 2.6 kg at birth, slight jaundice on day 4. Today: pad soaked within an hour and heavy head; baby drinking less milk. One urgent alert open.` };
    }
    if (p === '/api/tickets') {
      const s = url.searchParams.get('state');
      return state.tickets.filter((t) => !s || (s === 'open' ? t.state !== 'closed' : t.state === s));
    }
    if (p === '/api/ashas') {
      return [
        { id: 'a_001', name: 'Sunita', phone: '+919800000009', village: 'Hosahalli', open_tasks: ashaList('a_001').filter((x) => x.reason !== 'Routine visit').length + 1 },
        { id: 'a_002', name: 'Geetha', phone: '+919800000019', village: 'Kempapura', open_tasks: ashaList('a_002').filter((x) => x.reason !== 'Routine visit').length },
      ];
    }
    if (seg[1] === 'asha' && seg[3] === 'list') return ashaList(seg[2] ?? '');
    if (seg[1] === 'onboarding' && seg[2] === 'photo' && seg[3]) return photoJob(seg[3]);
    if (p === '/api/calls/recent') return state.calls.slice(0, 20);
    if (seg[1] === 'calls' && seg[2]) {
      const call = state.calls.find((c) => c.interaction_id === seg[2]);
      if (!call) throw new MockHttpError(404);
      const facts = state.entries.filter((e) => e.interaction_id === call.interaction_id && e.code)
        .map((e) => ({ subject: e.subject, code: e.code ?? '', present: true, value: e.value, numeric_value: e.numeric_value, unit: e.unit, quote: e.quote ?? '', confidence: 0.9 }));
      return { call, transcript: state.transcripts[call.interaction_id] ?? call.summary ?? '', facts, rule_ids: [] };
    }
    if (p === '/api/stats') return stats();
    if (p === '/api/stats/status-by-day') return statusByDay();
  }

  if (method === 'POST') {
    if (seg[1] === 'tickets' && (seg[3] === 'ack' || seg[3] === 'reached')) {
      const t = state.tickets.find((x) => x.id === seg[2]);
      if (!t) throw new MockHttpError(404);
      t.state = seg[3] === 'ack' ? 'acknowledged' : 'reached';
      t.history.push({ at: new Date().toISOString(), state: t.state, by: str(body, 'by'), note: str(body, 'note') });
      return t;
    }
    if (p === '/api/onboarding/photo') {
      const jobId = `job_${Date.now().toString(36)}`;
      state.photoJobs[jobId] = { polls: 0 };
      return { job_id: jobId, fields: null, status: 'pending' };
    }
    if (p === '/api/calls') {
      const id = `int_${Date.now().toString(36)}`;
      const purpose = str(body, 'purpose') === 'onboarding' ? 'onboarding' : 'checkin';
      const motherId = str(body, 'mother_id');
      state.calls.unshift({ interaction_id: id, mother_id: motherId, purpose, direction: 'outbound', started_at: new Date().toISOString(), duration_seconds: 0, answered: true, outcome: 'completed', summary: 'Call in progress' });
      if (purpose === 'onboarding') setTimeout(() => confirmOnboarding(state, motherId, id), 6000);
      return { interaction_id: id };
    }
    if (p === '/api/demo/reset') {
      state = createState();
      return { ok: true };
    }
    if (p === '/api/demo/advance-day') {
      const m = mother(str(body, 'mother_id'));
      const days = Number((body as Body | undefined)?.days ?? 1);
      m.day_since_delivery += days;
      m.delivery_date = iso(m.day_since_delivery * DAY).slice(0, 10);
      m.next_call_at = iso(-2 * HOUR);
      return m;
    }
    if (p === '/api/demo/inject') {
      const level = runPipeline(state, str(body, 'mother_id'), str(body, 'caller_phone'), str(body, 'transcript'));
      return { ok: true, level };
    }
  }
  throw new MockHttpError(404);
}

export async function mockRequest(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
  await delay(120 + Math.random() * 180);
  const url = new URL(path, 'http://mock.local');
  return clone(route(method, url, body));
}

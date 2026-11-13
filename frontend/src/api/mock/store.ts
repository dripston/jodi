import type { Baby, CallLog, Entry, Level, Mother, Source, Ticket } from '../schemas';
import { ENTRY_SEEDS, iso, seedCalls, seedMothers, seedTickets, TRANSCRIPTS, type EntrySeed } from './seed';

/** In-memory mock database. Mirrors backend behaviour closely enough to drive every page. */

export interface MockState {
  mothers: Mother[];
  babies: Baby[];
  entries: Entry[];
  tickets: Ticket[];
  calls: CallLog[];
  transcripts: Record<string, string>;
  photoJobs: Record<string, { polls: number }>;
  seq: number;
}

/** Deterministic 64-hex hash (FNV-1a based). Mock only; the backend uses sha256. */
export function mockHash(input: string): string {
  let out = '';
  for (let round = 0; round < 8; round++) {
    let h = 0x811c9dc5 ^ round;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    out += (h >>> 0).toString(16).padStart(8, '0');
  }
  return out;
}

function canonical(entry: Omit<Entry, 'hash' | 'prev_hash'>): string {
  const sorted = Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify(sorted);
}

export function hashEntry(entry: Entry): string {
  const { hash: _h, prev_hash: prev, rule_ids: _r, ...rest } = entry;
  return mockHash(prev + canonical(rest));
}

export function appendEntry(state: MockState, partial: Omit<Entry, 'id' | 'prev_hash' | 'hash'>): Entry {
  const chain = state.entries.filter((e) => e.mother_id === partial.mother_id);
  const prev = chain.length ? (chain[chain.length - 1]?.hash ?? 'GENESIS') : 'GENESIS';
  state.seq += 1;
  const entry: Entry = { ...partial, id: `e_${String(state.seq).padStart(3, '0')}`, prev_hash: prev, hash: '' };
  entry.hash = hashEntry(entry);
  state.entries.push(entry);
  return entry;
}

const SOURCE_PHONE: Partial<Record<Source, (m: Mother) => string | null>> = {
  mother_reported: (m) => m.phone,
  family_reported: (m) => m.family_phones[0]?.phone ?? null,
  asha_measured: () => '+919800000009',
  doctor_verified: (m) => m.phone,
};

function entryFromSeed(state: MockState, seed: EntrySeed): void {
  const mother = state.mothers.find((m) => m.id === seed.m);
  const baby = state.babies.find((b) => b.mother_id === seed.m);
  if (!mother || !baby) return;
  appendEntry(state, {
    mother_id: seed.m,
    subject: seed.subject,
    subject_id: seed.subject === 'mother' ? mother.id : baby.id,
    kind: seed.kind,
    code: seed.code,
    value: seed.value,
    numeric_value: seed.num ?? null,
    unit: seed.unit ?? null,
    quote: seed.quote ?? null,
    source: seed.source,
    source_phone: SOURCE_PHONE[seed.source]?.(mother) ?? null,
    interaction_id: null,
    created_at: iso(seed.ago),
    rule_ids: seed.rules,
  });
}

export function createState(): MockState {
  const { mothers, babies } = seedMothers();
  const state: MockState = {
    mothers, babies, entries: [], tickets: seedTickets(), calls: seedCalls(),
    transcripts: { ...TRANSCRIPTS }, photoJobs: {}, seq: 0,
  };
  [...ENTRY_SEEDS].sort((a, b) => b.ago - a.ago).forEach((s) => entryFromSeed(state, s));
  return state;
}

export const LEVEL_RANK: Record<Level, number> = { green: 0, amber: 1, red: 2 };

export function maxLevel(levels: Level[]): Level {
  return levels.reduce<Level>((acc, l) => (LEVEL_RANK[l] > LEVEL_RANK[acc] ? l : acc), 'green');
}

export function verifyChain(state: MockState, motherId: string) {
  const chain = state.entries.filter((e) => e.mother_id === motherId);
  let prev = 'GENESIS';
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (!e || e.prev_hash !== prev || hashEntry(e) !== e.hash) {
      return { valid: false, entries: chain.length, broken_at: i + 1 };
    }
    prev = e.hash;
  }
  return { valid: true, entries: chain.length, broken_at: null };
}

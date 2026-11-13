import type { Level, Source } from '@/api/schemas';

/**
 * Synthetic data for the illustrative previews on the landing page.
 * Names match the demo seed. No real patients.
 */

export interface SampleFamily {
  mother: string;
  baby: string;
  day: number;
  motherLevel: Level;
  babyLevel: Level;
  reason: string;
  asha: string;
  nextCall: string;
}

export const FAMILIES: SampleFamily[] = [
  {
    mother: 'Lakshmi',
    baby: 'Baby of Lakshmi',
    day: 5,
    motherLevel: 'red',
    babyLevel: 'amber',
    reason: 'Pad soaked within an hour, heavy head, and baby drinking less milk',
    asha: 'Sunita',
    nextCall: 'Today, 4:00 pm',
  },
  {
    mother: 'Fathima',
    baby: 'Baby of Fathima',
    day: 4,
    motherLevel: 'amber',
    babyLevel: 'green',
    reason: 'Two check-in calls in a row were not answered',
    asha: 'Sunita',
    nextCall: 'Today, 6:30 pm',
  },
  {
    mother: 'Kavya',
    baby: 'Anika',
    day: 12,
    motherLevel: 'green',
    babyLevel: 'green',
    reason: 'Routine check-in. Feeding well and resting.',
    asha: 'Sunita',
    nextCall: 'Sat, 10:00 am',
  },
  {
    mother: 'Priya',
    baby: 'Baby of Priya',
    day: 2,
    motherLevel: 'green',
    babyLevel: 'green',
    reason: 'Baby feeding well, 8 times today',
    asha: 'Geetha',
    nextCall: 'Tomorrow, 9:00 am',
  },
  {
    mother: 'Meena',
    baby: 'Dhruv',
    day: 21,
    motherLevel: 'green',
    babyLevel: 'green',
    reason: 'Weight gain on track at the ASHA visit',
    asha: 'Geetha',
    nextCall: 'Mon, 11:00 am',
  },
];

export const KPIS = {
  red: 1,
  amber: 2,
  medianMinutes: 14,
  ashaVisitPct: 92,
  enrolled: 128,
  active: 96,
  callsDone: 18,
  callsScheduled: 24,
  callsMissed: 3,
};

/** Mothers by day since delivery, grouped in weeks: [green, amber, red]. */
export const STATUS_BY_WEEK: { label: string; counts: [number, number, number] }[] = [
  { label: 'Wk 1', counts: [14, 3, 1] },
  { label: 'Wk 2', counts: [17, 2, 0] },
  { label: 'Wk 3', counts: [15, 1, 0] },
  { label: 'Wk 4', counts: [13, 1, 0] },
  { label: 'Wk 5', counts: [12, 0, 0] },
  { label: 'Wk 6', counts: [11, 1, 0] },
];

export interface SampleEntry {
  time: string;
  text: string;
  quote?: string;
  source: Source;
  level?: Level;
}

export const TIMELINE: SampleEntry[] = [
  {
    time: '10:42 am',
    text: 'Pad soaked within an hour',
    quote: 'ondu ganteyalli batte poorti',
    source: 'mother_reported',
    level: 'red',
  },
  {
    time: '10:42 am',
    text: 'Baby drinking less milk than usual',
    quote: 'magu haalu kammi kudiyuttide',
    source: 'mother_reported',
    level: 'amber',
  },
  { time: '9:15 am', text: 'Blood pressure 128/84', source: 'asha_measured' },
  { time: 'Day 0', text: 'C-section, high BP in pregnancy', source: 'document_extracted' },
];

export const TRANSCRIPT = [
  { who: 'Jodi', text: 'Namaskara Lakshmi, how are you today?' },
  { who: 'Lakshmi', text: 'Naalku batte since morning… tale bhaara.' },
  { who: 'Jodi', text: 'Thank you for telling me. And the baby?' },
  { who: 'Lakshmi', text: 'Magu haalu kammi kudiyuttide.' },
];

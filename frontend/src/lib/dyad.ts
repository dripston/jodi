import { differenceInCalendarDays } from 'date-fns';
import type { Baby, Level, Mother } from '@/api/schemas';
import { toDate } from './format';

export function babyName(baby: Baby, mother: Mother): string {
  return baby.name ?? `Baby of ${mother.name}`;
}

const RANK: Record<Level, number> = { green: 0, amber: 1, red: 2 };

export function levelRank(level: Level): number {
  return RANK[level];
}

export function dyadLevel(mother: Mother, baby?: Baby): Level {
  const b = baby ?? mother.baby;
  return b && RANK[b.status] > RANK[mother.status] ? b.status : mother.status;
}

/** Day since delivery for a given timestamp. */
export function dayOf(iso: string, deliveryDate: string): number {
  return Math.max(0, differenceInCalendarDays(toDate(iso), toDate(deliveryDate)));
}

import type { Entry, Level } from '@/api/schemas';
import { ruleLevel } from '@/lib/clinical';
import { dayOf, levelRank } from '@/lib/dyad';
import type { DaySummary } from '@/components/timeline/DayNavigator';

/** Count entries per day and keep the highest rule level fired that day. */
export function summariseDays(entries: Entry[], deliveryDate: string): Map<number, DaySummary> {
  const map = new Map<number, DaySummary>();
  for (const e of entries) {
    const day = dayOf(e.created_at, deliveryDate);
    const current = map.get(day) ?? { day, count: 0, level: null };
    let level: Level | null = current.level;
    for (const r of e.rule_ids ?? []) {
      const l = ruleLevel(r);
      if (l && (level === null || levelRank(l) > levelRank(level))) level = l;
    }
    map.set(day, { day, count: current.count + 1, level });
  }
  return map;
}

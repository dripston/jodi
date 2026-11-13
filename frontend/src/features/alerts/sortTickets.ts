import type { Ticket } from '@/api/schemas';
import { levelRank } from '@/lib/dyad';

/** Red first, then amber; oldest first within a level. */
export function sortTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort(
    (a, b) =>
      levelRank(b.level) - levelRank(a.level) ||
      (a.history[0]?.at ?? '').localeCompare(b.history[0]?.at ?? ''),
  );
}

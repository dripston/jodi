import { History } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { Entry } from '@/api/schemas';
import { EmptyState } from '@/components/data/EmptyState';
import { dayOf } from '@/lib/dyad';
import { formatShortDate } from '@/lib/format';
import { DayGroup } from './DayGroup';
import { TimelineItem } from './TimelineItem';

interface TimelineProps {
  entries: Entry[];
  deliveryDate: string;
  showSubject?: boolean;
  emptyTitle?: string;
  /** Sticky day headers under the 56px top bar. Off inside drawers and the live board. */
  sticky?: boolean;
}

/** Entries arrive newest first. Items not seen on a previous render animate in. */
export function Timeline({ entries, deliveryDate, showSubject, emptyTitle = 'No entries yet', sticky = true }: TimelineProps) {
  const seen = useRef<Set<string> | null>(null);
  const firstRender = seen.current === null;
  const known = seen.current ?? new Set<string>();

  useEffect(() => {
    seen.current = new Set(entries.map((e) => e.id));
  }, [entries]);

  const groups = useMemo(() => {
    const map = new Map<number, Entry[]>();
    for (const e of entries) {
      const d = dayOf(e.created_at, deliveryDate);
      map.set(d, [...(map.get(d) ?? []), e]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b - a);
  }, [entries, deliveryDate]);

  if (!entries.length) {
    return <EmptyState icon={History} title={emptyTitle} description="New facts from calls, ASHA visits and doctor notes appear here." />;
  }

  return (
    <div className="space-y-6">
      {groups.map(([day, items]) => (
        <DayGroup key={day} sticky={sticky} day={day} dateLabel={formatShortDate(items[0]?.created_at ?? deliveryDate)} count={items.length}>
          {items.map((e) => (
            <TimelineItem key={e.id} entry={e} showSubject={showSubject} isNew={!firstRender && !known.has(e.id)} />
          ))}
        </DayGroup>
      ))}
    </div>
  );
}

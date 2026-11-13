import { BellOff } from 'lucide-react';
import type { Level, Mother, Ticket } from '@/api/schemas';
import { AlertCard } from '@/components/alerts/AlertCard';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { LEVEL_LABELS } from '@/lib/labels';
import { sortTickets } from './sortTickets';

interface AlertListProps {
  tickets: Ticket[] | undefined;
  mothers: Map<string, Mother>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription: string;
  compact?: boolean;
  grouped?: boolean;
}

const GROUPS: Level[] = ['red', 'amber'];

export function AlertList({ tickets, mothers, loading, error, onRetry, emptyTitle, emptyDescription, compact, grouped }: AlertListProps) {
  if (loading && !tickets) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-44 rounded" />
        ))}
      </div>
    );
  }
  const sorted = sortTickets(tickets ?? []);
  const card = (t: Ticket) => <AlertCard key={t.id} ticket={t} mother={mothers.get(t.mother_id)} compact={compact} pulse />;
  return (
    <div className="space-y-4">
      {error ? <ErrorState onRetry={onRetry} /> : null}
      {tickets && tickets.length === 0 ? (
        <Card>
          <EmptyState icon={BellOff} title={emptyTitle} description={emptyDescription} />
        </Card>
      ) : null}
      {grouped
        ? GROUPS.map((level) => {
            const items = sorted.filter((t) => t.level === level);
            if (!items.length) return null;
            return (
              <section key={level} aria-label={LEVEL_LABELS[level]} className="space-y-3 pt-2 first:pt-0">
                <h3 className={cn('flex items-center gap-2 text-h3', level === 'red' ? 'text-red-fg' : 'text-amber-fg')}>
                  <span aria-hidden className={cn('size-2 rounded-full', level === 'red' ? 'bg-red-fg' : 'bg-amber-fg')} />
                  {LEVEL_LABELS[level]}
                  <span className="tabular font-normal text-text-subtle">{items.length}</span>
                </h3>
                {items.map(card)}
              </section>
            );
          })
        : sorted.map(card)}
    </div>
  );
}

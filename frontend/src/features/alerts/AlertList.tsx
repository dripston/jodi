import { BellOff } from 'lucide-react';
import type { Mother, Ticket } from '@/api/schemas';
import { AlertCard } from '@/components/alerts/AlertCard';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
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
}

export function AlertList({ tickets, mothers, loading, error, onRetry, emptyTitle, emptyDescription, compact }: AlertListProps) {
  if (loading && !tickets) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-44 rounded" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {error ? <ErrorState onRetry={onRetry} /> : null}
      {tickets && tickets.length === 0 ? (
        <Card>
          <EmptyState icon={BellOff} title={emptyTitle} description={emptyDescription} />
        </Card>
      ) : null}
      {sortTickets(tickets ?? []).map((t) => (
        <AlertCard key={t.id} ticket={t} mother={mothers.get(t.mother_id)} compact={compact} pulse />
      ))}
    </div>
  );
}

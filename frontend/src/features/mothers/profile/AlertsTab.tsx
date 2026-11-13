import { BellOff } from 'lucide-react';
import { useTickets } from '@/api/queries';
import type { Mother } from '@/api/schemas';
import { AlertCard } from '@/components/alerts/AlertCard';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

export function AlertsTab({ mother }: { mother: Mother }) {
  const { data, isLoading, isError, refetch } = useTickets();
  const tickets = data?.filter((t) => t.mother_id === mother.id) ?? [];
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (isLoading) return <Skeleton className="h-48 rounded" />;
  if (!tickets.length) {
    return <EmptyState icon={BellOff} title="No alerts for this family" description="Alerts appear here when a rule flags mother or baby." />;
  }
  return (
    <div className="space-y-4">
      {tickets.map((t) => (
        <AlertCard key={t.id} ticket={t} mother={mother} />
      ))}
    </div>
  );
}

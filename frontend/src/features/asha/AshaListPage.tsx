import { format } from 'date-fns';
import { ListChecks } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAshaList, useOpenTickets } from '@/api/queries';
import { useAshaIndex } from '@/api/useMotherIndex';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AshaHeader } from './AshaHeader';
import { AshaShell } from './AshaShell';
import { AshaVisitCard } from './AshaVisitCard';

export function AshaListPage() {
  const { id = '' } = useParams();
  const list = useAshaList(id);
  const tickets = useOpenTickets();
  const asha = useAshaIndex().get(id);
  const urgent = list.data?.filter((x) => x.reason !== 'Routine visit').length ?? 0;
  return (
    <AshaShell>
      <AshaHeader back={{ to: '/ashas', label: 'All ASHAs' }}>
        <h1 className="text-title text-text">{asha ? `${asha.name}'s visits` : 'Visits'}</h1>
        <p className="mt-1 text-body text-text-muted">{format(new Date(), 'EEEE, d MMMM')}</p>
        {list.data ? (
          <p className="mt-3 text-body-lg text-text">
            <span className="tabular font-semibold">{urgent}</span> of {list.data.length} families need you today
          </p>
        ) : null}
      </AshaHeader>
      <main className="space-y-3 p-4 pb-12">
        {list.isError ? <ErrorState onRetry={() => void list.refetch()} /> : null}
        {list.isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded" />) : null}
        {list.data?.length === 0 ? (
          <EmptyState icon={ListChecks} title="No visits today" description="New families appear here as soon as they are enrolled." />
        ) : null}
        {list.data?.map((item) => (
          <AshaVisitCard
            key={item.mother.id}
            item={item}
            ashaId={id}
            ticket={tickets.data?.find((t) => t.mother_id === item.mother.id)}
          />
        ))}
      </main>
    </AshaShell>
  );
}

import { ChevronRight, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAshas } from '@/api/queries';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { AshaHeader } from './AshaHeader';
import { AshaShell } from './AshaShell';

export function AshaIndexPage() {
  const { data, isLoading, isError, refetch } = useAshas();
  return (
    <AshaShell>
      <AshaHeader back={{ to: '/', label: 'Dashboard' }}>
        <h1 className="text-title text-text">ASHAs</h1>
        <p className="text-small text-text-muted">Choose an ASHA to see her visit list for today.</p>
      </AshaHeader>
      <main className="space-y-3 p-4 pb-12">
        {isError ? <ErrorState onRetry={() => void refetch()} /> : null}
        {isLoading ? [0, 1].map((i) => <Skeleton key={i} className="h-20 rounded" />) : null}
        {data?.length === 0 ? <EmptyState icon={Stethoscope} title="No ASHAs yet" /> : null}
        {data?.map((a) => (
          <Link key={a.id} to={`/asha/${a.id}`} className="block rounded">
            <Card className="flex min-h-18 items-center gap-4 p-4 transition-colors duration-120 hover:border-border-strong">
              <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                <Stethoscope className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-h3 text-text">{a.name}</p>
                <p className="text-small text-text-muted">{a.village}</p>
              </div>
              {a.open_tasks ? (
                <span className="tabular rounded-full bg-amber-bg px-2 py-0.5 text-caption text-amber-fg">{a.open_tasks} to visit</span>
              ) : a.open_tasks === 0 ? (
                <span className="text-small text-text-subtle">All clear</span>
              ) : null}
              <ChevronRight className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
            </Card>
          </Link>
        ))}
      </main>
    </AshaShell>
  );
}

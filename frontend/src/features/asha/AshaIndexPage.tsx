import { ChevronRight, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAshas } from '@/api/queries';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatPhone } from '@/lib/format';
import { AshaHeader } from './AshaHeader';
import { AshaShell } from './AshaShell';
import { AshaSidebar } from './AshaSidebar';
import { ASHA_CONTAINER } from './layout';

export function AshaIndexPage() {
  const { data, isLoading, isError, refetch } = useAshas();
  return (
    <AshaShell sidebar={<AshaSidebar />}>
      <AshaHeader back={{ to: '/app', label: 'Dashboard' }} eyebrow="ASHA workspace" title="ASHAs">
        <p className="mt-2 text-body-lg text-text-muted">
          Choose an ASHA to see today&apos;s visit list.
        </p>
      </AshaHeader>
      <main className={cn(ASHA_CONTAINER, 'pb-16')}>
        {isError ? <ErrorState onRetry={() => void refetch()} /> : null}
        {data?.length === 0 ? <EmptyState icon={Stethoscope} title="No ASHAs yet" /> : null}
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading
            ? [0, 1].map((i) => (
                <li key={i}>
                  <Skeleton className="h-28 rounded-lg" />
                </li>
              ))
            : null}
          {data?.map((a) => (
            <li key={a.id}>
              <Link
                to={`/asha/${a.id}`}
                className="group flex h-full items-center gap-4 rounded-lg border border-border bg-surface p-5 shadow-raised transition-colors duration-120 hover:border-border-strong"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Stethoscope className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-h3 text-text">{a.name}</p>
                  <p className="tabular truncate text-small text-text-muted">
                    {a.village} · {formatPhone(a.phone)}
                  </p>
                  {a.open_tasks ? (
                    <p className="tabular mt-2 text-small font-medium text-amber-fg">
                      {a.open_tasks} to visit today
                    </p>
                  ) : a.open_tasks === 0 ? (
                    <p className="mt-2 text-small text-text-subtle">All clear today</p>
                  ) : null}
                </div>
                <ChevronRight
                  className="size-5 shrink-0 text-text-subtle transition-transform duration-120 group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </AshaShell>
  );
}

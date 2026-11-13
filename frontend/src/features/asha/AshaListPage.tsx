import { format } from 'date-fns';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAshaList, useOpenTickets } from '@/api/queries';
import { useAshaIndex } from '@/api/useMotherIndex';
import { ErrorState } from '@/components/data/ErrorState';
import { Drawer } from '@/components/ui/Drawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { AshaBottomNav } from './AshaBottomNav';
import { AshaHeader } from './AshaHeader';
import { AshaShell } from './AshaShell';
import { AshaSidebar } from './AshaSidebar';
import { ASHA_CONTAINER } from './layout';
import { VisitDetail } from './VisitDetail';
import { VisitList } from './VisitList';
import { VisitSummary } from './VisitSummary';
import { countByLevel, filterVisits, useVisitParams } from './visitView';

const WIDE = '(min-width: 1536px)';

export function AshaListPage() {
  const { id = '' } = useParams();
  const list = useAshaList(id);
  const tickets = useOpenTickets();
  const asha = useAshaIndex().get(id);
  const { view, focus, setView, setFocus } = useVisitParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const counts = countByLevel(list.data);
  const visible = filterVisits(list.data, view);
  const focused = visible.find((x) => x.mother.id === focus) ?? visible[0];
  const ticketFor = (motherId: string) => tickets.data?.find((t) => t.mother_id === motherId);
  const needYou = counts.red + counts.amber;

  const select = (motherId: string) => {
    setFocus(motherId);
    if (!window.matchMedia(WIDE).matches) setDrawerOpen(true);
  };

  return (
    <AshaShell sidebar={<AshaSidebar current={asha} />}>
      <AshaHeader
        back={{ to: '/ashas', label: 'All ASHAs' }}
        eyebrow={format(new Date(), 'EEEE, d MMMM')}
        title={asha ? `${asha.name}'s visits` : 'Visits'}
      >
        {list.data?.length ? (
          <p className="mt-2 text-body-lg text-text-muted">
            {needYou ? (
              <>
                <span className="tabular font-semibold text-text">{needYou}</span> of{' '}
                {list.data.length} families need you today. Start with priority 1.
              </>
            ) : (
              `All ${list.data.length} families are stable today. Routine visits only.`
            )}
          </p>
        ) : null}
      </AshaHeader>

      <main className={cn(ASHA_CONTAINER, 'pb-28 sm:pb-16')}>
        {list.isError ? <ErrorState onRetry={() => void list.refetch()} /> : null}
        {list.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="hidden h-24 rounded-lg sm:block" />
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        ) : null}
        {list.data ? (
          <>
            {list.data.length ? (
              <div className="mb-8 hidden sm:block">
                <VisitSummary counts={counts} view={view} onChange={setView} />
              </div>
            ) : null}
            <div className="2xl:flex 2xl:items-start 2xl:gap-8">
              <div className="min-w-0 flex-1">
                <VisitList
                  items={visible}
                  total={list.data.length}
                  view={view}
                  tickets={tickets.data}
                  ashaId={id}
                  focusId={focused?.mother.id}
                  onSelect={select}
                  onShowAll={() => setView('all')}
                />
              </div>
              {focused ? (
                <aside
                  aria-label={`Details for ${focused.mother.name}`}
                  className="sticky top-6 hidden w-96 shrink-0 rounded-lg border border-border bg-surface p-6 shadow-raised 2xl:block"
                >
                  <VisitDetail item={focused} ticket={ticketFor(focused.mother.id)} />
                </aside>
              ) : null}
            </div>
          </>
        ) : null}
      </main>

      {list.data?.length ? <AshaBottomNav counts={counts} view={view} onChange={setView} /> : null}

      <Drawer
        open={drawerOpen && focused !== undefined}
        onOpenChange={setDrawerOpen}
        title={focused?.mother.name ?? 'Family'}
        description={
          focused
            ? `Priority ${focused.priority} · Day ${focused.mother.day_since_delivery} of 42`
            : undefined
        }
      >
        {focused ? (
          <VisitDetail item={focused} ticket={ticketFor(focused.mother.id)} showName={false} />
        ) : null}
      </Drawer>
    </AshaShell>
  );
}

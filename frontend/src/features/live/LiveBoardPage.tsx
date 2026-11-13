import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAudit, useMother, useOpenTickets, useTimeline } from '@/api/queries';
import { useAshaIndex } from '@/api/useMotherIndex';
import { AlertCard } from '@/components/alerts/AlertCard';
import { ErrorState } from '@/components/data/ErrorState';
import { DyadHeader } from '@/components/dyad/DyadHeader';
import { DyadHeaderSkeleton } from '@/components/dyad/DyadHeaderSkeleton';
import { Timeline } from '@/components/timeline/Timeline';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { AshaTopFive } from './AshaTopFive';
import { DemoControls } from './DemoControls';
import { LiveTopBar } from './LiveTopBar';
import { NextCallCard } from './NextCallCard';

export function LiveBoardPage() {
  const [params] = useSearchParams();
  const motherId = params.get('mother') ?? 'm_001';
  const mother = useMother(motherId);
  const timeline = useTimeline(motherId);
  const tickets = useOpenTickets();
  const audit = useAudit(motherId);
  const ashas = useAshaIndex();
  const [controlsHidden, setControlsHidden] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('projector');
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      if (!typing && e.key.toLowerCase() === 'h' && !e.metaKey && !e.ctrlKey) setControlsHidden((h) => !h);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('projector');
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const m = mother.data?.mother;
  const asha = m?.asha_id ? ashas.get(m.asha_id) : undefined;
  const alerts = tickets.data?.filter((t) => t.mother_id === motherId) ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-bg lg:h-screen">
      <LiveTopBar error={mother.isError || timeline.isError} />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-12">
        <section className="min-h-0 space-y-6 overflow-y-auto lg:col-span-4" aria-label="Mother and baby">
          {mother.data ? <DyadHeader mother={mother.data.mother} baby={mother.data.baby} asha={asha} pulse compact /> : <DyadHeaderSkeleton />}
          {m ? <NextCallCard mother={m} /> : null}
        </section>
        <Card className="flex min-h-0 flex-col lg:col-span-5">
          <CardHeader
            title="Live timeline"
            description="New facts appear here as Jodi hears them"
            actions={
              timeline.data ? (
                <span className="tabular text-small text-text-subtle">{timeline.data.length} entries</span>
              ) : null
            }
          />
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-border px-5 pb-5 pt-3">
            {timeline.isError ? <ErrorState className="mb-3" /> : null}
            {timeline.data && m ? (
              <Timeline entries={timeline.data} deliveryDate={m.delivery_date} sticky={false} />
            ) : (
              <Skeleton className="h-96" />
            )}
          </div>
        </Card>
        <section className="min-h-0 space-y-6 overflow-y-auto lg:col-span-3" aria-label="Alerts and ASHA">
          {alerts.map((t) => (
            <AlertCard key={t.id} ticket={t} mother={m} compact pulse />
          ))}
          {!alerts.length && tickets.data ? (
            <Card className="p-5">
              <p className="text-h3 text-text">No open alerts</p>
              <p className="mt-1 text-body text-text-muted">{m?.name ?? 'This mother'} and her baby have no open alert.</p>
            </Card>
          ) : null}
          {asha && m ? <AshaTopFive asha={asha} highlightId={m.id} /> : null}
        </section>
      </main>
      {m ? <DemoControls mother={m} asha={asha} audit={audit.data} hidden={controlsHidden} /> : null}
    </div>
  );
}

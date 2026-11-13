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
    <div className="flex h-screen flex-col bg-bg">
      <LiveTopBar error={mother.isError || timeline.isError} />
      <main className="grid min-h-0 flex-1 grid-cols-12 gap-6 p-6">
        <section className="col-span-4 min-h-0 space-y-6 overflow-y-auto" aria-label="Mother and baby">
          {mother.data ? <DyadHeader mother={mother.data.mother} baby={mother.data.baby} asha={asha} pulse compact /> : <DyadHeaderSkeleton />}
          {m ? <NextCallCard mother={m} /> : null}
        </section>
        <Card className="col-span-5 flex min-h-0 flex-col">
          <CardHeader title="Live timeline" description="New facts appear as Jodi hears them" />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2">
            {timeline.isError ? <ErrorState className="mb-3" /> : null}
            {timeline.data && m ? (
              <Timeline entries={timeline.data} deliveryDate={m.delivery_date} sticky={false} />
            ) : (
              <Skeleton className="h-96" />
            )}
          </div>
        </Card>
        <section className="col-span-3 min-h-0 space-y-6 overflow-y-auto" aria-label="Alerts and ASHA">
          {alerts.map((t) => (
            <AlertCard key={t.id} ticket={t} mother={m} compact pulse />
          ))}
          {!alerts.length && tickets.data ? (
            <Card className="p-5 text-body text-text-muted">No open alerts for {m?.name ?? 'this mother'}.</Card>
          ) : null}
          {asha && m ? <AshaTopFive asha={asha} highlightId={m.id} /> : null}
        </section>
      </main>
      {m ? <DemoControls mother={m} asha={asha} audit={audit.data} hidden={controlsHidden} /> : null}
    </div>
  );
}

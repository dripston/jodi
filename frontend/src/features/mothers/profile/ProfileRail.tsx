import { CalendarClock } from 'lucide-react';
import { useAudit, useOpenTickets } from '@/api/queries';
import type { Mother } from '@/api/schemas';
import { AlertCard } from '@/components/alerts/AlertCard';
import { ChainBadge } from '@/components/status/ChainBadge';
import { Card, CardBody } from '@/components/ui/Card';
import { formatAbsolute, formatWhen } from '@/lib/format';
import { HearSummary } from './HearSummary';
import { ShareRecord } from './ShareRecord';

export function ProfileRail({ mother }: { mother: Mother }) {
  const tickets = useOpenTickets();
  const audit = useAudit(mother.id);
  const open = tickets.data?.filter((t) => t.mother_id === mother.id) ?? [];
  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:w-rail lg:shrink-0" aria-label="Summary">
      {open.map((t) => (
        <AlertCard key={t.id} ticket={t} mother={mother} compact />
      ))}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <p className="text-small text-text-muted">Next scheduled call</p>
            {mother.next_call_at ? (
              <p className="mt-1 inline-flex items-center gap-1.5 text-body font-medium text-text" title={formatAbsolute(mother.next_call_at)}>
                <CalendarClock className="size-4 text-text-muted" strokeWidth={1.75} aria-hidden />
                {formatWhen(mother.next_call_at)}
              </p>
            ) : (
              <p className="mt-1 text-body text-text-muted">Not scheduled</p>
            )}
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-small text-text-muted">Record integrity</p>
            <ChainBadge audit={audit.data} loading={audit.isLoading} className="mt-1" />
          </div>
          <div className="border-t border-border pt-4">
            <HearSummary motherId={mother.id} />
          </div>
          <div className="border-t border-border pt-4">
            <ShareRecord motherId={mother.id} />
          </div>
        </CardBody>
      </Card>
    </aside>
  );
}

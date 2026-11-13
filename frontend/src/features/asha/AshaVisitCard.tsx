import { MapPinCheck, Phone } from 'lucide-react';
import { useTicketAction } from '@/api/queries';
import type { AshaListItem, Ticket } from '@/api/schemas';
import { StatusPill } from '@/components/status/StatusPill';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast-store';
import { cn } from '@/lib/cn';
import { dyadLevel } from '@/lib/dyad';

interface AshaVisitCardProps {
  item: AshaListItem;
  ticket?: Ticket;
  ashaId: string;
}

const STRIPE = { red: 'bg-red-fg', amber: 'bg-amber-fg', green: 'bg-border-strong' } as const;

export function AshaVisitCard({ item, ticket, ashaId }: AshaVisitCardProps) {
  const reached = useTicketAction('reached');
  const level = dyadLevel(item.mother, item.baby);
  const canReach = ticket && ticket.state !== 'reached' && ticket.state !== 'closed';
  const isReached = ticket?.state === 'reached';
  return (
    <article className="relative overflow-hidden rounded border border-border bg-surface shadow-raised">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', STRIPE[level])} />
      <div className="py-4 pl-5 pr-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="tabular text-h1 text-text-subtle" aria-label={`Priority ${item.priority}`}>
              {item.priority}
            </span>
            <div>
              <h2 className="text-h1 text-text">{item.mother.name}</h2>
              <p className="text-small text-text-muted">Day {item.mother.day_since_delivery} since delivery</p>
            </div>
          </div>
          <StatusPill level={level} />
        </div>
        <p className="mt-3 text-body-lg text-text">{item.reason}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
        <Button asChild className="h-12" variant={level === 'green' ? 'secondary' : 'primary'}>
          <a href={`tel:${item.mother.phone}`} aria-label={`Call ${item.mother.name}`}>
            <Phone strokeWidth={1.75} />
            Call
          </a>
        </Button>
        <Button
          className="h-12"
          disabled={!canReach}
          loading={reached.isPending}
          icon={<MapPinCheck strokeWidth={1.75} />}
          onClick={() =>
            ticket &&
            reached.mutate(
              { ticketId: ticket.id, by: `asha:${ashaId}` },
              {
                onSuccess: () => toast(`${item.mother.name} marked as reached`, { tone: 'success' }),
                onError: () => toast('Could not save. Try again.', { tone: 'error' }),
              },
            )
          }
        >
          {isReached ? 'Reached' : ticket ? 'Mark reached' : 'No alert'}
        </Button>
      </div>
    </article>
  );
}

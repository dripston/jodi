import { MapPinCheck, Phone } from 'lucide-react';
import { useTicketAction } from '@/api/queries';
import type { AshaListItem, Ticket } from '@/api/schemas';
import { StatusPill } from '@/components/status/StatusPill';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/toast-store';
import { dyadLevel } from '@/lib/dyad';

interface AshaVisitCardProps {
  item: AshaListItem;
  ticket?: Ticket;
  ashaId: string;
}

export function AshaVisitCard({ item, ticket, ashaId }: AshaVisitCardProps) {
  const reached = useTicketAction('reached');
  const level = dyadLevel(item.mother, item.baby);
  const canReach = ticket && ticket.state !== 'reached' && ticket.state !== 'closed';
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-h3 text-text">
          {item.priority}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-h3 text-text">{item.mother.name}</p>
            <StatusPill level={level} size="sm" />
          </div>
          <p className="mt-1 text-body text-text-muted">{item.reason}</p>
          <p className="mt-1 text-small text-text-subtle">Day {item.mother.day_since_delivery} since delivery</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild size="lg" variant={level === 'green' ? 'secondary' : 'primary'}>
          <a href={`tel:${item.mother.phone}`} aria-label={`Call ${item.mother.name}`}>
            <Phone strokeWidth={1.75} />
            Call
          </a>
        </Button>
        <Button
          size="lg"
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
          {ticket?.state === 'reached' ? 'Reached' : 'Mark reached'}
        </Button>
      </div>
    </Card>
  );
}

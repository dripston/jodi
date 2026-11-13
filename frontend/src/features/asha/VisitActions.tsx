import { MapPinCheck, Phone } from 'lucide-react';
import { useTicketAction } from '@/api/queries';
import type { AshaListItem, Ticket } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast-store';
import { cn } from '@/lib/cn';
import { itemLevel } from './visitView';

interface VisitActionsProps {
  item: AshaListItem;
  ticket?: Ticket;
  ashaId: string;
  className?: string;
}

/** Call (tel: link) and Mark reached (optimistic ticket update). 48px tall on phones, 40px on desktop. */
export function VisitActions({ item, ticket, ashaId, className }: VisitActionsProps) {
  const reached = useTicketAction('reached');
  const level = itemLevel(item);
  const canReach = ticket !== undefined && ticket.state !== 'reached' && ticket.state !== 'closed';
  const isReached = ticket?.state === 'reached';
  const size = 'h-12 md:h-10';
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <Button
        asChild
        className={size}
        variant={level === 'green' || isReached ? 'secondary' : 'primary'}
      >
        <a href={`tel:${item.mother.phone}`} aria-label={`Call ${item.mother.name}`}>
          <Phone strokeWidth={1.75} />
          Call
        </a>
      </Button>
      <Button
        className={size}
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
  );
}

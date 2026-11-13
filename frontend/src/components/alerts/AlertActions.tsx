import { Check, MapPinCheck } from 'lucide-react';
import { useTicketAction } from '@/api/queries';
import type { Ticket } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast-store';
import { cn } from '@/lib/cn';

const DASHBOARD_USER = 'district:dashboard';

export function AlertActions({ ticket, className, by = DASHBOARD_USER }: { ticket: Ticket; className?: string; by?: string }) {
  const ack = useTicketAction('ack');
  const reached = useTicketAction('reached');
  const onError = () => toast('Could not update the alert', { tone: 'error', description: 'The change was undone. Try again.' });

  if (ticket.state === 'reached' || ticket.state === 'closed') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-small text-green-fg', className)}>
        <MapPinCheck className="size-4" strokeWidth={1.75} aria-hidden />
        {ticket.state === 'closed' ? 'Closed after follow-up' : 'Reached · waiting for follow-up check'}
      </span>
    );
  }
  const canAck = ticket.state === 'open' || ticket.state === 'notified';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {canAck ? (
        <Button
          size="sm"
          variant="secondary"
          loading={ack.isPending}
          icon={<Check strokeWidth={1.75} />}
          onClick={() => ack.mutate({ ticketId: ticket.id, by }, { onError })}
        >
          Acknowledge
        </Button>
      ) : null}
      <Button
        size="sm"
        variant={canAck ? 'ghost' : 'secondary'}
        loading={reached.isPending}
        icon={<MapPinCheck strokeWidth={1.75} />}
        onClick={() => reached.mutate({ ticketId: ticket.id, by }, { onError })}
      >
        Mark reached
      </Button>
    </div>
  );
}

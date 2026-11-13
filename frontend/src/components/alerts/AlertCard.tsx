import { ArrowUpRight, MessageCircleWarning } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Mother, Ticket } from '@/api/schemas';
import { RuleChip } from '@/components/status/RuleChip';
import { StatusPill } from '@/components/status/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { formatWhen } from '@/lib/format';
import { TICKET_STATE_LABELS } from '@/lib/labels';
import { AlertActions } from './AlertActions';
import { EscalationCountdown } from './EscalationCountdown';
import { TicketStepper } from './TicketStepper';

interface AlertCardProps {
  ticket: Ticket;
  mother?: Mother;
  compact?: boolean;
  pulse?: boolean;
}

function subjectsText(t: Ticket): string {
  if (t.subjects.includes('mother') && t.subjects.includes('baby')) return 'Mother and baby';
  return t.subjects.includes('baby') ? 'Baby' : 'Mother';
}

/** Severity stripe on the left; name, reason and rules read top to bottom; actions in the footer. */
export function AlertCard({ ticket, mother, compact, pulse }: AlertCardProps) {
  const opened = ticket.history[0]?.at;
  const live = ticket.state !== 'reached' && ticket.state !== 'closed';
  const stripe = !live ? 'bg-border-strong' : ticket.level === 'red' ? 'bg-red-fg' : 'bg-amber-fg';
  return (
    <article
      aria-label={`${ticket.level === 'red' ? 'Urgent' : 'Needs check'} alert for ${mother?.name ?? 'mother'}`}
      className={cn(
        'relative overflow-hidden rounded border bg-surface shadow-raised',
        live && ticket.level === 'red' ? 'border-red-border' : 'border-border',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', stripe)} />
      <div className="py-4 pl-6 pr-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill level={ticket.level} size="sm" pulse={pulse && live} />
          {ticket.dismissed_by_family ? (
            <Badge tone="amber">
              <MessageCircleWarning strokeWidth={1.75} aria-hidden />
              Dismissed by family · kept open
            </Badge>
          ) : null}
          <span className="ml-auto text-small text-text-subtle">
            {TICKET_STATE_LABELS[ticket.state]}
            {opened ? ` · ${formatWhen(opened)}` : ''}
          </span>
        </div>
        <Link
          to={`/mothers/${ticket.mother_id}`}
          className="group mt-3 inline-flex items-baseline gap-2 rounded-sm"
        >
          <span className="text-h1 text-text group-hover:text-brand">{mother?.name ?? 'Mother'}</span>
          <span className="text-small text-text-muted">
            {mother ? `Day ${mother.day_since_delivery} · ` : ''}
            {subjectsText(ticket)}
          </span>
          <ArrowUpRight className="size-4 self-center text-text-subtle group-hover:text-brand" strokeWidth={1.75} aria-hidden />
        </Link>
        <p className="mt-1.5 text-body-lg text-text">{ticket.reason_text}</p>
        {ticket.rule_ids.length ? (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {ticket.rule_ids.map((r) => (
              <RuleChip key={r} ruleId={r} />
            ))}
          </div>
        ) : null}
        {compact ? null : (
          <div className="mt-5 max-w-120">
            <TicketStepper state={ticket.state} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border py-3 pl-6 pr-5">
        {live && ticket.next_escalation_at ? (
          <EscalationCountdown at={ticket.next_escalation_at} target={ticket.state === 'acknowledged' ? 'ANM' : 'ASHA'} />
        ) : (
          <span className="text-small text-text-muted">Escalation stopped</span>
        )}
        <AlertActions ticket={ticket} className="ml-auto" />
      </div>
    </article>
  );
}

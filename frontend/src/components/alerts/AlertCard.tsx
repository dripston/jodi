import { Baby, ChevronRight, MessageCircleWarning, Siren, TriangleAlert, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Mother, Ticket } from '@/api/schemas';
import { RuleChip } from '@/components/status/RuleChip';
import { StatusPill } from '@/components/status/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatWhen } from '@/lib/format';
import { AlertActions } from './AlertActions';
import { EscalationCountdown } from './EscalationCountdown';
import { TicketStepper } from './TicketStepper';

interface AlertCardProps {
  ticket: Ticket;
  mother?: Mother;
  compact?: boolean;
  pulse?: boolean;
}

export function AlertCard({ ticket, mother, compact, pulse }: AlertCardProps) {
  const LevelIcon = ticket.level === 'red' ? Siren : TriangleAlert;
  const opened = ticket.history[0]?.at;
  const live = ticket.state !== 'reached' && ticket.state !== 'closed';
  return (
    <Card className={cn('overflow-hidden', ticket.level === 'red' && live && 'border-red-border')}>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <LevelIcon className={cn('size-5', ticket.level === 'red' ? 'text-red-fg' : 'text-amber-fg')} strokeWidth={1.75} aria-hidden />
          <Link
            to={`/mothers/${ticket.mother_id}`}
            className="group inline-flex items-center gap-1 text-h3 text-text hover:text-brand"
          >
            {mother?.name ?? 'Mother'}
            {mother ? <span className="font-normal text-text-muted">· day {mother.day_since_delivery}</span> : null}
            <ChevronRight className="size-4 text-text-subtle group-hover:text-brand" strokeWidth={1.75} aria-hidden />
          </Link>
          <StatusPill level={ticket.level} size="sm" pulse={pulse} className="ml-auto" />
        </div>
        <p className="mt-2 text-body text-text">{ticket.reason_text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {ticket.subjects.map((s) => (
            <Badge key={s} tone="outline">
              {s === 'baby' ? <Baby strokeWidth={1.75} aria-hidden /> : <User strokeWidth={1.75} aria-hidden />}
              {s === 'baby' ? 'Baby' : 'Mother'}
            </Badge>
          ))}
          {ticket.rule_ids.map((r) => (
            <RuleChip key={r} ruleId={r} />
          ))}
          {ticket.dismissed_by_family ? (
            <Badge tone="amber">
              <MessageCircleWarning strokeWidth={1.75} aria-hidden />
              Dismissed by family · still open
            </Badge>
          ) : null}
        </div>
        {compact ? null : (
          <div className="mt-5">
            <TicketStepper state={ticket.state} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-surface-muted px-5 py-3">
        {live && ticket.next_escalation_at ? (
          <EscalationCountdown at={ticket.next_escalation_at} target={ticket.state === 'acknowledged' ? 'ANM' : 'ASHA'} />
        ) : opened ? (
          <span className="text-small text-text-muted">Opened {formatWhen(opened)}</span>
        ) : null}
        <AlertActions ticket={ticket} className="ml-auto" />
      </div>
    </Card>
  );
}

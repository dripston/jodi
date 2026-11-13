import { ChevronRight } from 'lucide-react';
import type { AshaListItem, Ticket } from '@/api/schemas';
import { StatusPill } from '@/components/status/StatusPill';
import { cn } from '@/lib/cn';
import { babyName } from '@/lib/dyad';
import { TICKET_STATE_LABELS } from '@/lib/labels';
import { VisitActions } from './VisitActions';
import { itemLevel } from './visitView';

interface AshaVisitCardProps {
  item: AshaListItem;
  ticket?: Ticket;
  ashaId: string;
  selected?: boolean;
  onSelect: () => void;
}

const STRIPE = { red: 'bg-red-fg', amber: 'bg-amber-fg', green: 'bg-border-strong' } as const;

function AlertLine({ ticket }: { ticket?: Ticket }) {
  if (!ticket) return <span>No open alert</span>;
  return (
    <>
      <span>Alert {TICKET_STATE_LABELS[ticket.state].toLowerCase()}</span>
      {ticket.dismissed_by_family ? (
        <span className="text-amber-fg">Family said it is normal</span>
      ) : null}
    </>
  );
}

/**
 * One family to visit. Phones: stacked card with full-width actions.
 * Tablet and up: details on the left, actions stacked in a fixed right column so every row aligns.
 */
export function AshaVisitCard({ item, ticket, ashaId, selected, onSelect }: AshaVisitCardProps) {
  const level = itemLevel(item);
  const { mother, baby } = item;
  const isReached = ticket?.state === 'reached';
  return (
    <article
      aria-label={`Priority ${item.priority}: ${mother.name}`}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-surface shadow-raised transition-colors duration-120',
        'border-border',
        selected && '2xl:border-text-subtle 2xl:ring-1 2xl:ring-text-subtle',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', STRIPE[level])} />
      <div className="flex flex-col gap-4 py-4 pl-5 pr-4 md:flex-row md:items-start md:gap-6 md:pl-6">
        <div className="flex min-w-0 flex-1 gap-3 md:gap-4">
          <span className="tabular w-7 shrink-0 text-h1 text-text-subtle" aria-hidden>
            {item.priority}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                <h2 className="min-w-0 text-h2 text-text">
                  <button
                    type="button"
                    onClick={onSelect}
                    className="group inline-flex max-w-full cursor-pointer items-center gap-1 rounded-sm text-left"
                    aria-label={`Show details for ${mother.name}`}
                  >
                    <span className="truncate group-hover:underline group-hover:underline-offset-4">
                      {mother.name}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-text-subtle"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </button>
                </h2>
                <p className="tabular whitespace-nowrap text-small text-text-muted">
                  Day {mother.day_since_delivery} of 42
                  {mother.day_since_delivery <= 7 ? ' · first week' : ''}
                </p>
              </div>
              <StatusPill level={level} />
            </div>
            <p
              className={cn(
                'mt-2 max-w-prose text-body-lg',
                isReached ? 'text-text-muted' : 'text-text',
              )}
            >
              {item.reason}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StatusPill size="sm" subject="Mother" level={mother.status} />
              <StatusPill size="sm" subject={babyName(baby, mother)} level={baby.status} />
              <span className="flex flex-wrap gap-x-3 text-caption font-normal text-text-subtle">
                <AlertLine ticket={ticket} />
              </span>
            </div>
          </div>
        </div>
        <VisitActions
          item={item}
          ticket={ticket}
          ashaId={ashaId}
          className="md:w-44 md:shrink-0 md:grid-cols-1"
        />
      </div>
    </article>
  );
}

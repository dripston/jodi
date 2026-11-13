import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { AshaListItem, Ticket } from '@/api/schemas';
import { TicketStepper } from '@/components/alerts/TicketStepper';
import { MetaFacts } from '@/components/dyad/MetaFacts';
import { RuleChip } from '@/components/status/RuleChip';
import { StatusPill } from '@/components/status/StatusPill';
import { babyName } from '@/lib/dyad';
import { formatGrams, formatWhen } from '@/lib/format';
import { complicationLabel, DELIVERY_LABELS, languageLabel } from '@/lib/labels';
import { VisitContacts } from './VisitContacts';
import { itemLevel } from './visitView';

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-5">
      <h3 className="text-eyebrow text-text-subtle">{label}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function AlertBlock({ ticket }: { ticket: Ticket }) {
  return (
    <Block label="Alert">
      <TicketStepper state={ticket.state} />
      {ticket.rule_ids.length ? (
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1">
          {ticket.rule_ids.map((r) => (
            <RuleChip key={r} ruleId={r} />
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-small text-text-muted">
        {ticket.history[0] ? `Raised ${formatWhen(ticket.history[0].at)}` : null}
        {ticket.dismissed_by_family ? (
          <span className="mt-1 block text-amber-fg">
            Family said it is normal. The alert stays open until someone reaches the mother.
          </span>
        ) : null}
      </p>
    </Block>
  );
}

/** Everything about one family on a single sheet: why, alert progress, mother and baby, who to call. */
interface VisitDetailProps {
  item: AshaListItem;
  ticket?: Ticket;
  /** The drawer already shows name and priority in its own title. */
  showName?: boolean;
}

export function VisitDetail({ item, ticket, showName = true }: VisitDetailProps) {
  const { mother, baby } = item;
  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-start justify-between gap-3">
          {showName ? (
            <div className="min-w-0">
              <p className="text-small text-text-muted">Priority {item.priority}</p>
              <h2 className="truncate text-h1 text-text">{mother.name}</h2>
            </div>
          ) : null}
          <StatusPill level={itemLevel(item)} />
        </div>
        <p className="mt-3 text-body-lg text-text">{item.reason}</p>
      </header>

      {ticket ? <AlertBlock ticket={ticket} /> : null}

      <Block label="Mother">
        <div className="flex items-center gap-2">
          <StatusPill size="sm" level={mother.status} />
          <span className="tabular text-small text-text-muted">
            Day {mother.day_since_delivery} of 42
          </span>
        </div>
        <MetaFacts
          items={[
            { label: 'Delivery', value: DELIVERY_LABELS[mother.delivery_type] },
            { label: 'Language', value: languageLabel(mother.language) },
            { label: 'Risk', value: mother.risk_profile === 'high' ? 'High' : 'Standard' },
          ]}
        />
        {mother.complications.length ? (
          <p className="mt-3 text-small text-text-muted">
            {mother.complications.map(complicationLabel).join(', ')}
          </p>
        ) : null}
      </Block>

      <Block label="Baby">
        <div className="flex items-center gap-2">
          <StatusPill size="sm" level={baby.status} />
          <span className="truncate text-small text-text-muted">{babyName(baby, mother)}</span>
        </div>
        <MetaFacts
          items={[
            {
              label: 'Birth weight',
              value: baby.birth_weight_grams
                ? formatGrams(baby.birth_weight_grams)
                : 'Not recorded',
            },
            {
              label: 'Born at',
              value: baby.gestation_weeks ? `${baby.gestation_weeks} weeks` : 'Not recorded',
            },
            {
              label: 'Last check-in',
              value: mother.last_checkin_at ? formatWhen(mother.last_checkin_at) : 'None yet',
            },
          ]}
        />
      </Block>

      <Block label="Who to call">
        <VisitContacts mother={mother} />
      </Block>

      <Link
        to={`/mothers/${mother.id}`}
        className="inline-flex items-center gap-1 rounded-sm text-body font-medium text-brand hover:underline hover:underline-offset-4"
      >
        Open full record
        <ArrowUpRight className="size-4" strokeWidth={1.75} aria-hidden />
      </Link>
    </div>
  );
}

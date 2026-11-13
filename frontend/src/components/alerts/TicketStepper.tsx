import { Check } from 'lucide-react';
import type { TicketState } from '@/api/schemas';
import { cn } from '@/lib/cn';
import { TICKET_STATE_LABELS } from '@/lib/labels';

const STEPS: TicketState[] = ['open', 'notified', 'acknowledged', 'reached', 'closed'];

export function TicketStepper({ state }: { state: TicketState }) {
  const current = STEPS.indexOf(state);
  return (
    <ol className="flex items-center" aria-label={`Ticket progress: ${TICKET_STATE_LABELS[state]}`}>
      {STEPS.map((step, i) => {
        const done = i < current || (i === current && state === 'closed');
        const active = i === current && !done;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none" aria-current={active ? 'step' : undefined}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full border transition-colors duration-180',
                  done && 'border-brand bg-brand text-white',
                  active && 'border-brand bg-surface ring-2 ring-brand-soft',
                  !done && !active && 'border-border bg-surface',
                )}
              >
                {done ? <Check className="size-3" strokeWidth={2.5} aria-hidden /> : null}
                {active ? <span className="size-1.5 rounded-full bg-brand" aria-hidden /> : null}
              </span>
              <span className={cn('text-caption', done || active ? 'text-text' : 'text-text-subtle')}>
                {TICKET_STATE_LABELS[step]}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span aria-hidden className={cn('mx-1 mb-5 h-px flex-1', i < current ? 'bg-brand' : 'bg-border')} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

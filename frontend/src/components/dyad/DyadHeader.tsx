import { Link2, Phone, Stethoscope } from 'lucide-react';
import type { Asha, Baby, Mother } from '@/api/schemas';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatPhone } from '@/lib/format';
import { relationLabel } from '@/lib/labels';
import { BabyMeta } from './BabyMeta';
import { MotherMeta } from './MotherMeta';

interface DyadHeaderProps {
  mother: Mother;
  baby: Baby;
  asha?: Asha;
  pulse?: boolean;
  compact?: boolean;
}

/** The signature "jodi" component: mother and baby as one pair. */
export function DyadHeader({ mother, baby, asha, pulse, compact }: DyadHeaderProps) {
  const decider = mother.family_phones.find((f) => f.decision_maker) ?? mother.family_phones[0];
  return (
    <Card>
      <div
        className={cn(
          'relative flex flex-col divide-y divide-border',
          !compact && 'md:flex-row md:divide-x md:divide-y-0',
        )}
      >
        <MotherMeta mother={mother} pulse={pulse} />
        <span
          aria-hidden
          className={cn(
            'absolute left-1/2 top-1/2 z-10 hidden size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-subtle',
            !compact && 'md:flex',
          )}
        >
          <Link2 className="size-4" strokeWidth={1.75} />
        </span>
        <BabyMeta baby={baby} mother={mother} pulse={pulse} />
      </div>
      {compact ? null : (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-border px-5 py-3.5 text-small text-text-muted md:px-6">
          {asha ? (
            <span className="inline-flex items-center gap-1.5">
              <Stethoscope className="size-4" strokeWidth={1.75} aria-hidden />
              ASHA <span className="font-medium text-text">{asha.name}</span> · {asha.village}
            </span>
          ) : null}
          {decider ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-4" strokeWidth={1.75} aria-hidden />
              Decision-maker <span className="font-medium text-text">{decider.name}</span> (
              {relationLabel(decider.relation).toLowerCase()}) ·{' '}
              <span className="tabular">{formatPhone(decider.phone)}</span>
            </span>
          ) : null}
        </div>
      )}
    </Card>
  );
}

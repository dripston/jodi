import { Baby as BabyIcon } from 'lucide-react';
import type { Baby, Mother } from '@/api/schemas';
import { StatusPill } from '@/components/status/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { babyName } from '@/lib/dyad';
import { formatGrams } from '@/lib/format';
import { MetaFacts } from './MetaFacts';

export function BabyMeta({ baby, mother, pulse }: { baby: Baby; mother: Mother; pulse?: boolean }) {
  const lowWeight = baby.birth_weight_grams !== null && baby.birth_weight_grams < 2500;
  const preterm = baby.gestation_weeks !== null && baby.gestation_weeks < 37;
  const age = mother.day_since_delivery;
  return (
    <div className="min-w-0 flex-1 p-5 md:p-6">
      <p className="flex items-center gap-1.5 text-eyebrow text-text-subtle">
        <BabyIcon className="size-3.5" strokeWidth={1.75} aria-hidden />
        Baby
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-title text-text">{babyName(baby, mother)}</h2>
        <StatusPill level={baby.status} pulse={pulse} />
      </div>
      <MetaFacts
        items={[
          { label: 'Age', value: `${age} ${age === 1 ? 'day' : 'days'}` },
          { label: 'Birth weight', value: baby.birth_weight_grams !== null ? formatGrams(baby.birth_weight_grams) : '—' },
          { label: 'Gestation', value: baby.gestation_weeks !== null ? `${baby.gestation_weeks} weeks` : '—' },
        ]}
      />
      {lowWeight || preterm ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {lowWeight ? <Badge tone="amber">Low birth weight</Badge> : null}
          {preterm ? <Badge tone="amber">Born early</Badge> : null}
        </div>
      ) : null}
    </div>
  );
}

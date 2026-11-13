import { Baby as BabyIcon } from 'lucide-react';
import type { Baby, Mother } from '@/api/schemas';
import { StatusPill } from '@/components/status/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { babyName } from '@/lib/dyad';
import { formatGrams } from '@/lib/format';

export function BabyMeta({ baby, mother, pulse }: { baby: Baby; mother: Mother; pulse?: boolean }) {
  const lowWeight = baby.birth_weight_grams !== null && baby.birth_weight_grams < 2500;
  const preterm = baby.gestation_weeks !== null && baby.gestation_weeks < 37;
  return (
    <div className="min-w-0 flex-1 p-5">
      <div className="flex items-center gap-2 text-small text-text-muted">
        <BabyIcon className="size-4" strokeWidth={1.75} aria-hidden />
        Baby
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-h1 text-text">{babyName(baby, mother)}</h2>
        <StatusPill level={baby.status} pulse={pulse} />
      </div>
      <p className="mt-1 text-body text-text-muted">
        <span className="tabular font-medium text-text">
          {mother.day_since_delivery} {mother.day_since_delivery === 1 ? 'day' : 'days'} old
        </span>
        {baby.birth_weight_grams !== null ? (
          <>
            <span aria-hidden> · </span>
            <span className="tabular">{formatGrams(baby.birth_weight_grams)}</span> at birth
          </>
        ) : null}
        {baby.gestation_weeks !== null ? (
          <>
            <span aria-hidden> · </span>
            <span className="tabular">{baby.gestation_weeks}</span> weeks
          </>
        ) : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {lowWeight ? <Badge tone="amber">Low birth weight</Badge> : null}
        {preterm ? <Badge tone="amber">Born early</Badge> : null}
        {!lowWeight && !preterm ? <Badge tone="outline">Term birth</Badge> : null}
      </div>
    </div>
  );
}

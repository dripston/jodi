import { Building2, MapPin, Phone, Star } from 'lucide-react';
import { useFacilities } from '@/api/queries';
import type { FacilityOption } from '@/api/schemas';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatPhone } from '@/lib/format';

const NEED: Record<string, string> = {
  emergency_mother: 'Emergency for the mother: can treat heavy bleeding, BP, fits (C-section, blood bank), open 24×7',
  emergency_baby: 'Emergency for the baby: newborn care, open 24×7',
  emergency: 'Emergency for mother and baby: open 24×7',
  routine_checkup: 'Routine check-up and vaccines',
  phototherapy: 'Treatment for yellow colour (phototherapy)',
};

const BEDS_TONE = { available: 'green', limited: 'amber', full: 'red' } as const;

function OptionCard({ option, rank }: { option: FacilityOption; rank: number }) {
  const tone = BEDS_TONE[option.availability as keyof typeof BEDS_TONE] ?? 'neutral';
  return (
    <li className="space-y-2 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-body font-medium text-text">
            <span className="tabular text-text-subtle">{rank}.</span>
            {option.name}
            {rank === 1 ? (
              <Badge tone="brand" title="Jodi named this hospital in her instructions">
                <Star aria-hidden /> Jodi's choice
              </Badge>
            ) : null}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-muted">
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{option.distance_km.toFixed(1)} km</span>
            <span className="capitalize">{option.type}</span>
            {option.phone ? (
              <a className="inline-flex items-center gap-1 hover:text-text" href={`tel:${option.phone}`}>
                <Phone className="size-3.5" aria-hidden />
                {formatPhone(option.phone)}
              </a>
            ) : null}
          </p>
        </div>
        <Badge tone={tone}>Beds: {option.availability}</Badge>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {option.reasons.map((r) => (
          <li key={r}>
            <Badge tone="outline">{r}</Badge>
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Ranked hospitals: can treat it → beds → distance band → cost. The first is the one Jodi names. */
export function HospitalsTab({ motherId }: { motherId: string }) {
  const { data, isLoading, isError, refetch } = useFacilities(motherId);
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Where she should go"
        description={data ? (NEED[data.need] ?? data.need) : 'Ranked by what they can treat, beds, distance and cost'}
      />
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !data || data.options.length === 0 ? (
        <EmptyState icon={Building2} title="No suitable hospital found" description="Call 108 for the nearest ambulance." />
      ) : (
        <>
          <ol className="divide-y divide-border">
            {data.options.map((o, i) => (
              <OptionCard key={o.id} option={o} rank={i + 1} />
            ))}
          </ol>
          <p className="border-t border-border px-5 py-3 text-caption text-text-subtle">
            Hospital services and bed availability are demo data: call the hospital to confirm. In an emergency a much
            nearer hospital that can treat her always ranks above a cheaper one further away.
          </p>
        </>
      )}
    </Card>
  );
}

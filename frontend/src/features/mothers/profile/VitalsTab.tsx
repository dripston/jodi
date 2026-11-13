import { useVitals } from '@/api/queries';
import { ErrorState } from '@/components/data/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { VitalChart } from './VitalChart';

export function VitalsTab({ motherId }: { motherId: string }) {
  const { data, isLoading, isError, refetch } = useVitals(motherId);
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-72 rounded" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <VitalChart
        title="Mother's blood pressure"
        unit="mmHg"
        data={data.bp}
        series={[
          { key: 'systolic', label: 'Upper', color: 'var(--brand)' },
          { key: 'diastolic', label: 'Lower', color: 'var(--text-muted)' },
        ]}
      />
      <VitalChart
        title="Baby's weight"
        unit="kg"
        data={data.baby_weight}
        series={[{ key: 'grams', label: 'Weight', color: 'var(--brand)' }]}
        format={(g) => `${(g / 1000).toFixed(2)} kg`}
      />
      <VitalChart
        title="Baby's breathing"
        unit="breaths per minute"
        data={data.breaths_per_minute}
        series={[{ key: 'value', label: 'Breaths', color: 'var(--brand)' }]}
      />
    </div>
  );
}

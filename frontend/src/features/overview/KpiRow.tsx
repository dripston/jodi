import { useStats } from '@/api/queries';
import { ErrorState } from '@/components/data/ErrorState';
import { KpiTile } from '@/components/data/KpiTile';
import { Card } from '@/components/ui/Card';
import { formatNumber } from '@/lib/format';

export function KpiRow() {
  const { data, isLoading, isError, refetch } = useStats();
  if (isError && !data) return <ErrorState onRetry={() => void refetch()} />;
  const loading = isLoading || !data;
  return (
    <Card className="grid grid-cols-1 gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-cols-4 [&>*]:bg-surface">
      <KpiTile
        loading={loading}
        label="Open alerts"
        value={
          data ? (
            <span className="inline-flex items-baseline gap-4">
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-red-fg">{data.open_alerts.red}</span>
                <span className="text-small font-medium text-red-fg">urgent</span>
              </span>
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-amber-fg">{data.open_alerts.amber}</span>
                <span className="text-small font-medium text-amber-fg">check today</span>
              </span>
            </span>
          ) : ''
        }
        sub="Open until a person is reached"
      />
      <KpiTile
        loading={loading}
        label="Median time to contact"
        value={data?.median_minutes_to_contact != null ? <>{data.median_minutes_to_contact}<span className="ml-1 text-h2 text-text-muted">min</span></> : '—'}
        sub="From flag to a person reached"
      />
      <KpiTile
        loading={loading}
        label="ASHA visit within 24 hours"
        value={data?.asha_visit_within_24h_pct != null ? <>{Math.round(data.asha_visit_within_24h_pct)}<span className="ml-0.5 text-h2 text-text-muted">%</span></> : '—'}
        sub="Of flagged families"
      />
      <KpiTile
        loading={loading}
        label="Mothers enrolled"
        value={data ? formatNumber(data.mothers_enrolled) : ''}
        sub={data ? `${formatNumber(data.active_dyads)} within the 42-day window` : ''}
      />
    </Card>
  );
}

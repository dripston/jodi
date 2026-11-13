import { useStats } from '@/api/queries';
import { ErrorState } from '@/components/data/ErrorState';
import { KpiTile } from '@/components/data/KpiTile';
import { formatNumber } from '@/lib/format';

export function KpiRow() {
  const { data, isLoading, isError, refetch } = useStats();
  if (isError && !data) return <ErrorState onRetry={() => void refetch()} />;
  const loading = isLoading || !data;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        loading={loading}
        label="Mothers enrolled"
        value={data ? formatNumber(data.mothers_enrolled) : ''}
        sub={data ? `${formatNumber(data.active_dyads)} within 42 days` : ''}
      />
      <KpiTile
        loading={loading}
        label="Open alerts"
        value={
          data ? (
            <span className="inline-flex items-baseline gap-3">
              <span className="text-red-fg">{data.open_alerts.red}</span>
              <span className="text-h1 text-text-subtle">/</span>
              <span className="text-amber-fg">{data.open_alerts.amber}</span>
            </span>
          ) : ''
        }
        sub="Urgent / needs check today"
      />
      <KpiTile
        loading={loading}
        label="Median time to contact"
        value={data?.median_minutes_to_contact != null ? `${data.median_minutes_to_contact} min` : '—'}
        sub="From flag to a person reached"
      />
      <KpiTile
        loading={loading}
        label="ASHA visit within 24 hours"
        value={data?.asha_visit_within_24h_pct != null ? `${Math.round(data.asha_visit_within_24h_pct)}%` : '—'}
        sub="Of flagged families"
      />
    </div>
  );
}

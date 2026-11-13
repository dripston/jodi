import { useStats } from '@/api/queries';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'muted' }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-body text-text-muted">{label}</dt>
      <dd className={tone === 'muted' ? 'tabular text-h3 text-text-muted' : 'tabular text-h3 text-text'}>{value}</dd>
    </div>
  );
}

export function TodayPanel() {
  const { data } = useStats();
  const c = data?.calls_today;
  if (!c || !data) {
    return (
      <Card className="space-y-3 p-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </Card>
    );
  }
  const pct = c.scheduled ? Math.round((c.completed / c.scheduled) * 100) : 0;
  const missedPct = c.scheduled ? Math.round((c.missed / c.scheduled) * 100) : 0;
  return (
    <Card className="p-5">
      <p className="text-small text-text-muted">Check-in calls</p>
      <p className="tabular mt-1 text-display text-text">
        {c.completed}
        <span className="text-h2 font-normal text-text-subtle"> of {c.scheduled}</span>
      </p>
      <div
        className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-muted"
        role="img"
        aria-label={`${pct}% completed, ${missedPct}% missed`}
      >
        <div className="rounded-full bg-text" style={{ width: `${pct}%` }} />
        <div className="rounded-full bg-amber-fg" style={{ width: `${missedPct}%` }} />
      </div>
      <dl className="mt-4 divide-y divide-border">
        <Stat label="Completed" value={c.completed} />
        <Stat label="Missed, retry scheduled" value={c.missed} />
        <Stat label="Still to call" value={Math.max(0, c.scheduled - c.completed - c.missed)} tone="muted" />
        <Stat label="ASHA tasks open" value={data.asha_tasks_open} />
      </dl>
    </Card>
  );
}

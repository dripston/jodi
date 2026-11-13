import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStatusByDay } from '@/api/queries';
import { ErrorState } from '@/components/data/ErrorState';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { LEVEL_LABELS } from '@/lib/labels';

const axis = { fontSize: 12, fill: 'var(--text-subtle)' };
const SERIES = [
  { key: 'green', color: 'var(--green-fg)', dot: 'bg-green-fg' },
  { key: 'amber', color: 'var(--amber-fg)', dot: 'bg-amber-fg' },
  { key: 'red', color: 'var(--red-fg)', dot: 'bg-red-fg' },
] as const;

export function StatusByDayChart() {
  const { data, isLoading, isError, refetch } = useStatusByDay();
  return (
    <Card>
      <CardHeader
        title="Mothers by status"
        description="By day since delivery, 0 to 42"
        actions={
          <div className="flex items-center gap-4">
            {SERIES.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-small text-text-muted">
                <span aria-hidden className={`size-2 rounded-sm ${s.dot}`} />
                {LEVEL_LABELS[s.key]}
              </span>
            ))}
          </div>
        }
      />
      <div className="h-64 px-2 pb-4 pt-4">
        {isError ? (
          <ErrorState className="mx-3" onRetry={() => void refetch()} />
        ) : isLoading || !data ? (
          <Skeleton className="mx-3 h-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={2}>
              <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={6} />
              <YAxis tick={axis} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'var(--surface-muted)' }}
                labelFormatter={(d) => `Day ${String(d)}`}
                contentStyle={{ border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
              />
              {SERIES.map((s, i) => (
                <Bar key={s.key} dataKey={s.key} name={LEVEL_LABELS[s.key]} stackId="a" fill={s.color} radius={i === 2 ? [2, 2, 0, 0] : 0} isAnimationActive={false} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

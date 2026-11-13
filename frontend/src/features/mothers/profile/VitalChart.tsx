import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import type { Source } from '@/api/schemas';
import { SourceBadge } from '@/components/status/SourceBadge';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatAbsolute, formatShortDate } from '@/lib/format';

export interface VitalPoint {
  at: string;
  source: Source;
  [series: string]: number | string;
}

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface VitalChartProps {
  title: string;
  unit: string;
  data: VitalPoint[];
  series: Series[];
  format?: (v: number) => string;
}

function ChartTooltip({ active, payload, unit, format }: Partial<TooltipContentProps<number, string>> & { unit: string; format?: (v: number) => string }) {
  const point = payload?.[0]?.payload as VitalPoint | undefined;
  if (!active || !point || !payload) return null;
  return (
    <div className="space-y-1.5 rounded border border-border bg-surface p-3 shadow-popover">
      <p className="text-caption text-text-muted">{formatAbsolute(point.at)}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="tabular text-body font-medium text-text">
          {p.name}: {format ? format(Number(p.value)) : `${p.value} ${unit}`}
        </p>
      ))}
      <SourceBadge source={point.source} />
    </div>
  );
}

const axis = { fontSize: 12, fill: 'var(--text-subtle)' };

export function VitalChart({ title, unit, data, series, format }: VitalChartProps) {
  return (
    <Card>
      <CardHeader title={title} description={`${data.length} ${data.length === 1 ? 'reading' : 'readings'} · ${unit}`} />
      <div className="h-56 px-2 pb-4 pt-2">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-small text-text-muted">No readings yet</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <XAxis dataKey="at" tickFormatter={formatShortDate} tick={axis} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} width={44} domain={['auto', 'auto']} tickFormatter={format} />
              <Tooltip content={<ChartTooltip unit={unit} format={format} />} cursor={{ stroke: 'var(--border-strong)' }} />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={1.5}
                  dot={{ r: 3, fill: 'var(--surface)', stroke: s.color, strokeWidth: 1.5 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

export function ConfidenceBar({ value }: { value: number | undefined }) {
  if (value === undefined) return null;
  const pct = Math.round(value * 100);
  const low = value < 0.75;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`Confidence ${pct}%`}>
        <div className={cn('h-full', low ? 'bg-amber-fg' : 'bg-text-subtle')} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular text-caption text-text-subtle">{pct}%</span>
      {low ? <Badge tone="amber">Check</Badge> : null}
    </div>
  );
}

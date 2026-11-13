import { cn } from '@/lib/cn';
import { KPIS, STATUS_BY_WEEK } from '../sampleData';

const TONES = ['bg-green-fg', 'bg-amber-fg', 'bg-red-fg'] as const;
const MAX = Math.max(...STATUS_BY_WEEK.map((w) => w.counts.reduce((a, b) => a + b, 0)));

/** District analytics: call completion and mothers by status across the six weeks. */
export function AnalyticsPreview({ className }: { className?: string }) {
  const pct = Math.round((KPIS.callsDone / KPIS.callsScheduled) * 100);
  return (
    <figure className={cn('rounded-lg border border-lp-line bg-white p-4', className)}>
      <figcaption className="sr-only">
        Illustrative district analytics: {pct}% of today's check-in calls completed, and mothers by
        status for each week after delivery.
      </figcaption>
      <div aria-hidden className="select-none">
        <div className="grid grid-cols-3 gap-3 border-b border-border pb-3">
          <Stat label="Calls done" value={`${pct}%`} />
          <Stat label="Time to contact" value={`${KPIS.medianMinutes}m`} />
          <Stat label="In 42 days" value={String(KPIS.active)} />
        </div>
        <p className="mt-3 text-caption text-text-muted">
          Mothers by status, by week since delivery
        </p>
        <div className="mt-2 flex h-28 items-end gap-2">
          {STATUS_BY_WEEK.map((w) => (
            <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-sm">
                {w.counts.map((c, i) =>
                  c ? (
                    <span
                      key={i}
                      className={cn('w-full', TONES[i])}
                      style={{ height: (c / MAX) * 96 }}
                    />
                  ) : null,
                )}
              </div>
              <span className="text-caption font-normal text-text-subtle">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="tabular font-serif text-lp-h3 text-lp-ink">{value}</p>
      <p className="text-caption font-normal text-text-muted">{label}</p>
    </div>
  );
}

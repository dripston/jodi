import { KpiTile } from '@/components/data/KpiTile';
import { StatusPill } from '@/components/status/StatusPill';
import { FAMILIES, KPIS } from '../sampleData';
import { BrowserFrame } from './PreviewFrame';
import { MiniSidebar } from './MiniSidebar';

/** Illustrative overview dashboard built from the app's own KPI tile and status pill. */
export function DashboardPreview({ className }: { className?: string }) {
  const pct = Math.round((KPIS.callsDone / KPIS.callsScheduled) * 100);
  return (
    <BrowserFrame
      address="jodi · Overview"
      label="Illustrative preview of the Jodi district overview, with synthetic data: open alerts, time to contact, ASHA visits and families who need attention."
      className={className}
    >
      <div className="flex">
        <MiniSidebar active="Overview" />
        <div className="min-w-0 flex-1 space-y-5 p-4 sm:p-6">
          <div>
            <p className="text-eyebrow text-text-subtle">Thursday, 13 November</p>
            <p className="mt-1 text-h1 text-text">How are our mothers and babies today?</p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-border lg:grid-cols-4 [&>*]:bg-surface">
            <KpiTile
              label="Open alerts"
              value={
                <span className="inline-flex items-baseline gap-3">
                  <span className="text-red-fg">{KPIS.red}</span>
                  <span className="text-amber-fg">{KPIS.amber}</span>
                </span>
              }
              sub="Urgent · check today"
            />
            <KpiTile
              label="Median time to contact"
              value={`${KPIS.medianMinutes} min`}
              sub="Flag to person reached"
            />
            <KpiTile
              label="ASHA visit within 24 h"
              value={`${KPIS.ashaVisitPct}%`}
              sub="Of flagged families"
            />
            <KpiTile
              label="Mothers enrolled"
              value={KPIS.enrolled}
              sub={`${KPIS.active} in the 42 days`}
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <p className="mb-2 border-b border-border pb-2 text-h3 text-text">
                Needs attention now
              </p>
              <ul className="divide-y divide-border rounded border border-border bg-surface">
                {FAMILIES.slice(0, 3).map((f) => (
                  <li key={f.mother} className="flex items-start gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-text">
                        {f.mother}{' '}
                        <span className="font-normal text-text-subtle">· Day {f.day}</span>
                      </p>
                      <p className="truncate text-small text-text-muted">{f.reason}</p>
                    </div>
                    <StatusPill level={f.motherLevel} size="sm" />
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden rounded border border-border bg-surface p-4 lg:block">
              <p className="text-small text-text-muted">Check-in calls</p>
              <p className="tabular mt-1 text-display text-text">
                {KPIS.callsDone}
                <span className="text-h2 font-normal text-text-subtle">
                  {' '}
                  of {KPIS.callsScheduled}
                </span>
              </p>
              <div className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-muted">
                <div className="rounded-full bg-text" style={{ width: `${pct}%` }} />
                <div className="w-1/12 rounded-full bg-amber-fg" />
              </div>
              <p className="mt-3 text-small text-text-muted">
                {KPIS.callsMissed} missed, retry scheduled
              </p>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

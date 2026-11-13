import { Check, Siren } from 'lucide-react';
import { StatusPill } from '@/components/status/StatusPill';
import { cn } from '@/lib/cn';
import { FAMILIES } from '../sampleData';
import { BrowserFrame } from './PreviewFrame';
import { MiniSidebar } from './MiniSidebar';

const STEPS = ['Open', 'Notified', 'Acknowledged', 'Reached', 'Closed'];

/** Alert queue: one urgent alert with its ticket stepper, plus a quieter one below. */
export function AlertsPreview() {
  const [urgent, missed] = FAMILIES;
  if (!urgent || !missed) return null;
  return (
    <BrowserFrame
      address="jodi · Alerts"
      label="Illustrative alert for Lakshmi: notified to family and ASHA, waiting for a person to confirm she was reached."
    >
      <div className="flex">
        <MiniSidebar active="Alerts" />
        <div className="min-w-0 flex-1 space-y-3 p-4 sm:p-6">
          <p className="text-h1 text-text">Alerts</p>
          <div className="rounded border border-border bg-surface p-4 shadow-urgent-row">
            <div className="flex flex-wrap items-center gap-2">
              <Siren className="size-4 text-red-fg" strokeWidth={1.75} />
              <span className="text-body font-medium text-text">{urgent.mother} and baby</span>
              <StatusPill level="red" size="sm" />
              <span className="ml-auto text-small text-text-muted">Escalates to ASHA in 6:42</span>
            </div>
            <p className="mt-2 text-small text-text-muted">{urgent.reason}</p>
            <ol className="mt-4 flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <li key={s} className="flex flex-1 flex-col gap-1.5">
                  <span
                    className={cn(
                      'h-1 rounded-full',
                      i < 2 ? 'bg-brand' : i === 2 ? 'bg-border-strong' : 'bg-border',
                    )}
                  />
                  <span
                    className={cn(
                      'flex items-center gap-1 text-caption',
                      i < 2 ? 'text-text' : 'text-text-subtle',
                    )}
                  >
                    {i < 2 ? <Check className="size-3" strokeWidth={2} /> : null}
                    <span className={cn(i > 2 && 'hidden sm:inline')}>{s}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex items-center gap-3 rounded border border-border bg-surface p-4">
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-text">{missed.mother}</p>
              <p className="truncate text-small text-text-muted">{missed.reason}</p>
            </div>
            <StatusPill level="amber" size="sm" />
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

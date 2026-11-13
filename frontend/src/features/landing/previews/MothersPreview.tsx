import { StatusPill } from '@/components/status/StatusPill';
import { FAMILIES } from '../sampleData';
import { BrowserFrame } from './PreviewFrame';
import { MiniSidebar } from './MiniSidebar';

const COLS = 'grid grid-cols-3 gap-3 md:grid-cols-5';

/** Mothers list: every enrolled pair with day, both statuses, ASHA and next call. */
export function MothersPreview() {
  return (
    <BrowserFrame
      address="jodi · Mothers"
      label="Illustrative mothers list with synthetic data: each mother and baby with day since delivery, status, ASHA and next call."
    >
      <div className="flex">
        <MiniSidebar active="Mothers" />
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <p className="text-h1 text-text">Mothers</p>
          <p className="mb-4 text-small text-text-muted">
            {FAMILIES.length} families in the 42-day window
          </p>
          <div className="overflow-hidden rounded border border-border bg-surface">
            <div className={`${COLS} bg-surface-muted px-3 py-2 text-caption text-text-muted`}>
              <span>Mother</span>
              <span>Status</span>
              <span className="hidden md:block">ASHA</span>
              <span className="hidden md:block">Next call</span>
              <span>Day</span>
            </div>
            {FAMILIES.map((f) => (
              <div
                key={f.mother}
                className={`${COLS} items-center border-t border-border px-3 py-2.5 text-small`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-text">{f.mother}</span>
                  <span className="block truncate text-caption font-normal text-text-subtle">
                    {f.baby}
                  </span>
                </span>
                <span className="flex flex-col items-start gap-1">
                  <StatusPill level={f.motherLevel} size="sm" />
                </span>
                <span className="hidden text-text-muted md:block">{f.asha}</span>
                <span className="hidden truncate text-text-muted md:block">{f.nextCall}</span>
                <span className="tabular text-text">{f.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

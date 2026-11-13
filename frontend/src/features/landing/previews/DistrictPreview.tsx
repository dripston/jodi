import { StatusPill } from '@/components/status/StatusPill';
import { FAMILIES } from '../sampleData';
import { AnalyticsPreview } from './AnalyticsPreview';

/** District team view: programme analytics above the families who need attention now. */
export function DistrictPreview() {
  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <div className="rounded-lg border border-lp-line bg-white p-4">
        <p className="sr-only">
          Illustrative list of families who need attention now, with synthetic data.
        </p>
        <div aria-hidden className="select-none">
          <p className="mb-2 text-caption text-text-muted">Needs attention now</p>
          <ul className="divide-y divide-border">
            {FAMILIES.slice(0, 3).map((f) => (
              <li key={f.mother} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-small text-text">
                  <span className="font-medium">{f.mother}</span>
                  <span className="text-text-subtle">
                    {' '}
                    · Day {f.day} · ASHA {f.asha}
                  </span>
                </span>
                <StatusPill level={f.motherLevel} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <AnalyticsPreview />
    </div>
  );
}

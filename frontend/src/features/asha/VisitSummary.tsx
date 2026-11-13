import { cn } from '@/lib/cn';
import { VIEW_DOT, VIEW_LABELS, type VisitView } from './visitView';

const NUMBER_TONE: Record<VisitView, string> = {
  all: 'text-text',
  red: 'text-red-fg',
  amber: 'text-amber-fg',
  green: 'text-text',
};
const ORDER: VisitView[] = ['all', 'red', 'amber', 'green'];

interface VisitSummaryProps {
  counts: Record<VisitView, number>;
  view: VisitView;
  onChange: (view: VisitView) => void;
}

/** Counters that double as the list filter (tablet and up). Phones use the bottom bar. */
export function VisitSummary({ counts, view, onChange }: VisitSummaryProps) {
  return (
    <div
      role="group"
      aria-label="Filter visits"
      className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-raised"
    >
      {ORDER.map((v) => {
        const active = v === view;
        const n = counts[v];
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(v)}
            className={cn(
              'relative cursor-pointer px-4 py-3.5 text-left transition-colors duration-120 ease-standard lg:px-5 lg:py-4',
              active ? 'bg-surface' : 'bg-bg hover:bg-surface',
            )}
          >
            <span className="flex items-center gap-2 text-small text-text-muted">
              <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', VIEW_DOT[v])} />
              <span className="truncate">{VIEW_LABELS[v]}</span>
            </span>
            <span
              className={cn(
                'tabular mt-1 block text-display',
                n > 0 ? NUMBER_TONE[v] : 'text-text-subtle',
              )}
            >
              {n}
            </span>
            {active ? (
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-text" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

import { cn } from '@/lib/cn';
import { VIEW_DOT, type VisitView } from './visitView';

const TABS: { view: VisitView; label: string }[] = [
  { view: 'all', label: 'All' },
  { view: 'red', label: 'Urgent' },
  { view: 'amber', label: 'Check today' },
];

interface AshaBottomNavProps {
  counts: Record<VisitView, number>;
  view: VisitView;
  onChange: (view: VisitView) => void;
}

/** Phone-only filter bar in the thumb zone. Each tab is a full 56px touch target. */
export function AshaBottomNav({ counts, view, onChange }: AshaBottomNavProps) {
  return (
    <nav
      aria-label="Filter visits"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-3">
        {TABS.map((tab) => {
          const active = tab.view === view;
          return (
            <button
              key={tab.view}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(tab.view)}
              className={cn(
                'relative flex h-14 cursor-pointer flex-col items-center justify-center gap-0.5 text-small transition-colors duration-120',
                active ? 'font-medium text-text' : 'text-text-muted',
              )}
            >
              <span className="flex items-center gap-1.5">
                <span aria-hidden className={cn('size-1.5 rounded-full', VIEW_DOT[tab.view])} />
                {tab.label}
              </span>
              <span className="tabular text-caption font-normal text-text-subtle">
                {counts[tab.view]}
              </span>
              {active ? (
                <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-text" />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

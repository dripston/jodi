import { useSearchParams } from 'react-router-dom';
import type { AshaListItem, Level } from '@/api/schemas';
import { dyadLevel } from '@/lib/dyad';
import { LEVEL_LABELS } from '@/lib/labels';

/**
 * Client-side view of the ASHA visit list. The server list is already sorted by priority;
 * these helpers only filter it, so priority numbers always match the full list.
 * View and focused family live in the URL (?view=red&focus=m_001) so they are deep-linkable.
 */
export type VisitView = 'all' | Level;

const VIEWS: VisitView[] = ['all', 'red', 'amber', 'green'];

export const VIEW_LABELS: Record<VisitView, string> = { all: 'All visits', ...LEVEL_LABELS };
export const VIEW_DOT: Record<VisitView, string> = {
  all: 'bg-text-subtle',
  red: 'bg-red-fg',
  amber: 'bg-amber-fg',
  green: 'bg-green-fg',
};

export function itemLevel(item: AshaListItem): Level {
  return dyadLevel(item.mother, item.baby);
}

export function countByLevel(items: AshaListItem[] = []): Record<VisitView, number> {
  const counts: Record<VisitView, number> = { all: items.length, red: 0, amber: 0, green: 0 };
  items.forEach((item) => {
    counts[itemLevel(item)] += 1;
  });
  return counts;
}

export function filterVisits(items: AshaListItem[] = [], view: VisitView): AshaListItem[] {
  return view === 'all' ? items : items.filter((item) => itemLevel(item) === view);
}

export function useVisitParams() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('view');
  const view: VisitView = VIEWS.find((v) => v === raw) ?? 'all';
  const focus = params.get('focus');

  const update = (key: 'view' | 'focus', value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null || value === 'all') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  return {
    view,
    focus,
    setView: (v: VisitView) => update('view', v),
    setFocus: (id: string) => update('focus', id),
  };
}

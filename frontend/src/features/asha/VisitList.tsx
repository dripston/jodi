import { ListChecks } from 'lucide-react';
import type { AshaListItem, Ticket } from '@/api/schemas';
import { EmptyState } from '@/components/data/EmptyState';
import { Button } from '@/components/ui/Button';
import { AshaVisitCard } from './AshaVisitCard';
import { VIEW_LABELS, type VisitView } from './visitView';

interface VisitListProps {
  items: AshaListItem[];
  total: number;
  view: VisitView;
  tickets?: Ticket[];
  ashaId: string;
  focusId?: string;
  onSelect: (motherId: string) => void;
  onShowAll: () => void;
}

/** Priority-ordered families. The heading states the sort so the ASHA knows where to start. */
export function VisitList({
  items,
  total,
  view,
  tickets,
  ashaId,
  focusId,
  onSelect,
  onShowAll,
}: VisitListProps) {
  if (total === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No visits today"
        description="New families appear here as soon as they are enrolled."
      />
    );
  }
  return (
    <section aria-labelledby="visit-order">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="visit-order" className="text-h3 text-text">
          {view === 'all' ? 'Visit order' : VIEW_LABELS[view]}
          <span className="tabular ml-2 font-normal text-text-subtle">{items.length}</span>
        </h2>
        <p className="text-small text-text-subtle">Most urgent first</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-body text-text-muted">
            No families marked “{VIEW_LABELS[view]}” right now.
          </p>
          <Button className="mt-4" size="sm" onClick={onShowAll}>
            Show all visits
          </Button>
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((item) => (
            <li key={item.mother.id}>
              <AshaVisitCard
                item={item}
                ashaId={ashaId}
                ticket={tickets?.find((t) => t.mother_id === item.mother.id)}
                selected={item.mother.id === focusId}
                onSelect={() => onSelect(item.mother.id)}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

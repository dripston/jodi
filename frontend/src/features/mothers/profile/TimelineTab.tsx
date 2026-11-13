import { useMemo, useState } from 'react';
import { useTimeline } from '@/api/queries';
import type { Source, Subject } from '@/api/schemas';
import { ErrorState } from '@/components/data/ErrorState';
import { Timeline } from '@/components/timeline/Timeline';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { SOURCE_LABELS } from '@/lib/labels';

type SubjectFilter = 'both' | Subject;
type SourceFilter = 'all' | Source;

const SUBJECTS: { value: SubjectFilter; label: string }[] = [
  { value: 'both', label: 'Both' },
  { value: 'mother', label: 'Mother' },
  { value: 'baby', label: 'Baby' },
];
const SOURCES = [
  { value: 'all' as const, label: 'All sources' },
  ...(Object.keys(SOURCE_LABELS) as Source[]).map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
];

export function TimelineTab({ motherId, deliveryDate }: { motherId: string; deliveryDate: string }) {
  const { data, isLoading, isError, refetch } = useTimeline(motherId);
  const [subject, setSubject] = useState<SubjectFilter>('both');
  const [source, setSource] = useState<SourceFilter>('all');

  const entries = useMemo(
    () =>
      (data ?? []).filter(
        (e) => (subject === 'both' || e.subject === subject) && (source === 'all' || e.source === source),
      ),
    [data, subject, source],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Show entries for" className="inline-flex rounded border border-border-strong bg-surface p-0.5">
          {SUBJECTS.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={subject === s.value}
              onClick={() => setSubject(s.value)}
              className={cn(
                'h-8 rounded-sm px-3 text-small font-medium transition-colors duration-120',
                subject === s.value ? 'bg-brand-soft text-brand' : 'text-text-muted hover:text-text',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Select label="Filter by source" value={source} onValueChange={setSource} options={SOURCES} className="w-48" />
        {data ? (
          <span className="tabular ml-auto text-small text-text-subtle">
            {entries.length} of {data.length} entries
          </span>
        ) : null}
      </div>
      {isError ? <ErrorState className="mb-4" onRetry={() => void refetch()} /> : null}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : data ? (
        <Timeline entries={entries} deliveryDate={deliveryDate} emptyTitle="No entries match these filters" />
      ) : null}
    </div>
  );
}

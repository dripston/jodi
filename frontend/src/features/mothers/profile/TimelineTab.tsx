import { useMemo, useState } from 'react';
import { useTimeline } from '@/api/queries';
import type { Source, Subject } from '@/api/schemas';
import { ErrorState } from '@/components/data/ErrorState';
import { DayNavigator } from '@/components/timeline/DayNavigator';
import { Timeline } from '@/components/timeline/Timeline';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { SOURCE_LABELS } from '@/lib/labels';
import { SubjectToggle, type SubjectFilter } from './SubjectToggle';
import { summariseDays } from './summariseDays';

type SourceFilter = 'all' | Source;
const SOURCES = [
  { value: 'all' as const, label: 'All sources' },
  ...(Object.keys(SOURCE_LABELS) as Source[]).map((s) => ({ value: s, label: SOURCE_LABELS[s] })),
];

interface TimelineTabProps {
  motherId: string;
  deliveryDate: string;
  today: number;
}

export function TimelineTab({ motherId, deliveryDate, today }: TimelineTabProps) {
  const { data, isLoading, isError, refetch } = useTimeline(motherId);
  const [subject, setSubject] = useState<SubjectFilter>('both');
  const [source, setSource] = useState<SourceFilter>('all');

  const entries = useMemo(
    () =>
      (data ?? []).filter(
        (e) => (subject === 'both' || e.subject === (subject as Subject)) && (source === 'all' || e.source === source),
      ),
    [data, subject, source],
  );
  const days = useMemo(() => summariseDays(entries, deliveryDate), [entries, deliveryDate]);

  return (
    <Card>
      <div className="border-b border-border px-5 pb-3 pt-4">
        <DayNavigator
          today={today}
          days={days}
          onSelect={(d) => document.getElementById(`day-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <SubjectToggle value={subject} onChange={setSubject} />
        <Select label="Filter by source" value={source} onValueChange={setSource} options={SOURCES} className="w-48" />
        {data ? (
          <span className="tabular ml-auto text-small text-text-subtle">
            {entries.length} of {data.length} entries
          </span>
        ) : null}
      </div>
      <div className="px-5 pb-5 pt-3">
        {isError ? <ErrorState className="mb-4" onRetry={() => void refetch()} /> : null}
        {isLoading ? (
          <div className="space-y-5 pt-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
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
    </Card>
  );
}

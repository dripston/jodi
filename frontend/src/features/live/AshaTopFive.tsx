import { Stethoscope } from 'lucide-react';
import { useAshaList } from '@/api/queries';
import type { Asha } from '@/api/schemas';
import { StatusPill } from '@/components/status/StatusPill';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { dyadLevel } from '@/lib/dyad';

export function AshaTopFive({ asha, highlightId }: { asha: Asha; highlightId: string }) {
  const { data } = useAshaList(asha.id);
  return (
    <Card>
      <CardHeader
        title={`ASHA ${asha.name}'s list`}
        description={`Top 5 visits · ${asha.village}`}
        actions={<Stethoscope className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />}
      />
      <ol className="mt-3 divide-y divide-border border-t border-border">
        {data
          ? data.slice(0, 5).map((item) => (
              <li
                key={item.mother.id}
                className={cn('flex items-center gap-3 px-5 py-3 transition-colors duration-240', item.mother.id === highlightId && 'bg-surface-muted')}
              >
                <span className="tabular w-5 self-start text-h2 text-text-subtle">{item.priority}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-text">{item.mother.name}</p>
                  <p className="line-clamp-2 text-small text-text-muted">{item.reason}</p>
                </div>
                <StatusPill level={dyadLevel(item.mother, item.baby)} size="sm" className="self-start" />
              </li>
            ))
          : [0, 1, 2].map((i) => (
              <li key={i} className="px-5 py-3">
                <Skeleton className="h-8 w-full" />
              </li>
            ))}
      </ol>
    </Card>
  );
}

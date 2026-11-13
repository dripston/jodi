import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DayGroupProps {
  day: number;
  dateLabel: string;
  count: number;
  sticky?: boolean;
  children: ReactNode;
}

export function DayGroup({ day, dateLabel, count, sticky = true, children }: DayGroupProps) {
  return (
    <section aria-label={`Day ${day}`}>
      <div className={cn('flex items-center gap-3 py-2', sticky && 'sticky top-14 z-20 bg-bg')}>
        <h3 className="text-h3 text-text">
          Day {day} <span className="font-normal text-text-muted">· {dateLabel}</span>
        </h3>
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="tabular text-caption text-text-subtle">
          {count} {count === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      <ol className="relative before:absolute before:bottom-3 before:left-5 before:top-3 before:w-px before:bg-border">
        {children}
      </ol>
    </section>
  );
}

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
    <section aria-label={`Day ${day}`} id={`day-${day}`} className="scroll-mt-28">
      <div className={cn('flex items-baseline gap-3 pb-1 pt-2', sticky && 'sticky top-14 z-20 bg-surface')}>
        <h3 className="text-h2 text-text">Day {day}</h3>
        <span className="text-small text-text-muted">{dateLabel}</span>
        <span className="tabular ml-auto text-caption font-normal text-text-subtle">
          {count} {count === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      <ol className="relative before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-border">
        {children}
      </ol>
    </section>
  );
}

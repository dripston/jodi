import type { Level } from '@/api/schemas';
import { cn } from '@/lib/cn';

export interface DaySummary {
  day: number;
  count: number;
  level: Level | null;
}

interface DayNavigatorProps {
  today: number;
  days: Map<number, DaySummary>;
  onSelect: (day: number) => void;
}

const MARK: Record<Level, string> = { red: 'bg-red-fg', amber: 'bg-amber-fg', green: 'bg-green-fg' };

/** Day 0 to 42 strip. Days with entries are clickable; dot colour is the highest rule level that day. */
export function DayNavigator({ today, days, onSelect }: DayNavigatorProps) {
  const last = Math.max(42, today);
  return (
    <div className="overflow-x-auto pb-1" role="group" aria-label="Jump to day">
      <div className="flex min-w-max items-end gap-0.5">
        {Array.from({ length: last + 1 }, (_, day) => {
          const info = days.get(day);
          const isToday = day === today;
          const future = day > today;
          return (
            <button
              key={day}
              type="button"
              disabled={!info}
              onClick={() => onSelect(day)}
              aria-label={info ? `Day ${day}, ${info.count} entries` : `Day ${day}, no entries`}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'group flex w-6 cursor-pointer flex-col items-center gap-1 rounded-sm py-1 disabled:cursor-default',
                isToday && 'bg-surface-muted',
              )}
            >
              <span
                className={cn(
                  'w-1 rounded-full transition-colors duration-120',
                  info ? 'h-5 bg-text-muted group-hover:bg-text' : future ? 'h-2 bg-border' : 'h-3 bg-border-strong',
                  info?.level && info.level !== 'green' && MARK[info.level],
                )}
              />
              <span className={cn('tabular text-caption', isToday ? 'text-text' : info ? 'text-text-muted' : 'text-text-subtle', day % 7 !== 0 && !isToday && 'invisible')}>
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

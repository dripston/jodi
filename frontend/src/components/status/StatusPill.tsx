import type { Level } from '@/api/schemas';
import { cn } from '@/lib/cn';
import { LEVEL_LABELS } from '@/lib/labels';

const TONE: Record<Level, string> = {
  green: 'border-green-border bg-green-bg text-green-fg',
  amber: 'border-amber-border bg-amber-bg text-amber-fg',
  red: 'border-red-border bg-red-bg text-red-fg',
};
const DOT: Record<Level, string> = { green: 'bg-green-fg', amber: 'bg-amber-fg', red: 'bg-red-fg' };

interface StatusPillProps {
  level: Level;
  /** Override the default label ("Stable", "Needs check today", "Urgent"). */
  label?: string;
  /** Prefix such as "Mother" or "Baby". */
  subject?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusPill({ level, label, subject, pulse, size = 'md', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-medium',
        size === 'sm' ? 'h-5 px-2 text-caption' : 'h-6 px-2.5 text-small',
        TONE[level],
        pulse && level === 'red' && 'animate-ring-pulse',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT[level])} />
      {subject ? <span className="text-text-muted">{subject}</span> : null}
      {label ?? LEVEL_LABELS[level]}
    </span>
  );
}

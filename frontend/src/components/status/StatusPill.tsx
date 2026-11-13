import type { Level } from '@/api/schemas';
import { cn } from '@/lib/cn';
import { LEVEL_LABELS } from '@/lib/labels';

/**
 * Urgent is solid red so it is the strongest signal on any screen.
 * Needs-check is a soft amber tint; stable is a quiet green tint.
 * Every variant carries a dot and a text label, never colour alone.
 */
const TONE: Record<Level, string> = {
  red: 'bg-red-fg text-white',
  amber: 'bg-amber-bg text-amber-fg ring-1 ring-inset ring-amber-border',
  green: 'bg-green-bg text-green-fg',
};
const DOT: Record<Level, string> = { red: 'bg-white', amber: 'bg-amber-fg', green: 'bg-green-fg' };

interface StatusPillProps {
  level: Level;
  label?: string;
  subject?: string;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusPill({ level, label, subject, pulse, size = 'md', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium',
        size === 'sm' ? 'h-5 px-2 text-caption' : 'h-6 px-2.5 text-small',
        TONE[level],
        pulse && level === 'red' && 'animate-ring-pulse',
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', DOT[level])} />
      {subject ? <span className={level === 'red' ? 'text-white/80' : 'opacity-75'}>{subject}</span> : null}
      {label ?? LEVEL_LABELS[level]}
    </span>
  );
}

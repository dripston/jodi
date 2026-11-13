import { cn } from '@/lib/cn';

/** The Jodi mark (a mother and a child as two linked circles) and the serif wordmark. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-brand" />
        <circle cx="13" cy="16" r="6" fill="none" className="stroke-bg" strokeWidth="2.25" />
        <circle
          cx="20.5"
          cy="16"
          r="3.75"
          fill="none"
          className="stroke-accent"
          strokeWidth="2.25"
        />
      </svg>
      {compact ? null : <span className="font-serif text-lp-h3 text-text">Jodi</span>}
    </span>
  );
}

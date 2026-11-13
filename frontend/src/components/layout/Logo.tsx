import { cn } from '@/lib/cn';

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-brand" />
        <circle cx="13" cy="16" r="6" fill="none" className="stroke-white" strokeWidth="2.25" />
        <circle cx="20.5" cy="16" r="3.75" fill="none" className="stroke-white" strokeWidth="2.25" />
      </svg>
      {compact ? null : <span className="text-h2 tracking-tight text-text">Jodi</span>}
    </span>
  );
}

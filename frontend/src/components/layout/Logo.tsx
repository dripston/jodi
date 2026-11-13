import { cn } from '@/lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-brand" />
        <circle cx="13" cy="16" r="6" fill="none" className="stroke-white" strokeWidth="2.5" />
        <circle cx="20" cy="16" r="4" fill="none" className="stroke-white" strokeWidth="2.5" />
      </svg>
      <span className="text-h3 tracking-tight text-text">Jodi</span>
    </span>
  );
}

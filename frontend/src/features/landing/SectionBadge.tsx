import { cn } from '@/lib/cn';

/** Small uppercase label above a section heading, with the accent dot. */
export function SectionBadge({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-lp-line bg-white px-3 py-1 text-caption uppercase tracking-wider text-lp-muted',
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-lp-accent" />
      {children}
    </span>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FrameProps {
  /** Describes the preview for screen readers; the drawing itself is hidden from them. */
  label: string;
  children: ReactNode;
  className?: string;
}

/** Desktop browser chrome around an illustrative product preview. */
export function BrowserFrame({
  label,
  address,
  children,
  className,
}: FrameProps & { address: string }) {
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-lg border border-lp-line bg-white shadow-popover',
        className,
      )}
    >
      <figcaption className="sr-only">{label}</figcaption>
      <div
        aria-hidden
        className="flex h-9 items-center gap-3 border-b border-border bg-surface-muted px-3.5"
      >
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2.5 rounded-full border border-border-strong bg-surface"
            />
          ))}
        </span>
        <span className="mx-auto flex h-6 min-w-0 max-w-xs flex-1 items-center justify-center truncate rounded-sm border border-border bg-surface px-3 text-caption font-normal text-text-subtle">
          {address}
        </span>
        <span className="w-10" />
      </div>
      <div aria-hidden className="pointer-events-none select-none bg-bg">
        {children}
      </div>
    </figure>
  );
}

/** Phone outline around a mobile preview (the ASHA workspace is phone-first). */
export function PhoneFrame({ label, children, className }: FrameProps) {
  return (
    <figure
      className={cn(
        'mx-auto w-full max-w-xs overflow-hidden rounded-lg border-4 border-lp-ink bg-bg shadow-popover',
        className,
      )}
    >
      <figcaption className="sr-only">{label}</figcaption>
      <div aria-hidden className="pointer-events-none select-none">
        <div className="flex h-6 items-center justify-center bg-lp-ink">
          <span className="h-1.5 w-12 rounded-full bg-text-muted" />
        </div>
        {children}
      </div>
    </figure>
  );
}

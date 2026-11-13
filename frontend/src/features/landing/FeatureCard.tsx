import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FeatureCardProps {
  index?: number;
  title: string;
  body: string;
  /** Illustration or product preview shown above the text. */
  visual: ReactNode;
  className?: string;
  visualClassName?: string;
}

/** White card with a decorative visual on top and a title and description below. */
export function FeatureCard({
  index,
  title,
  body,
  visual,
  className,
  visualClassName,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-lg border border-lp-line bg-white',
        className,
      )}
    >
      <div
        className={cn(
          'hatch flex flex-1 items-center justify-center border-b border-lp-line p-5 sm:p-6',
          visualClassName,
        )}
      >
        {visual}
      </div>
      <div className="p-5 sm:p-6">
        {index !== undefined ? (
          <p className="tabular text-caption text-lp-muted">{String(index + 1).padStart(2, '0')}</p>
        ) : null}
        <h3 className="mt-1 font-serif text-lp-h3 text-lp-ink">{title}</h3>
        <p className="mt-2 text-body-lg text-lp-muted">{body}</p>
      </div>
    </article>
  );
}

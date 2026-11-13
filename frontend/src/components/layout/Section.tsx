import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, description, actions, children, className }: SectionProps) {
  return (
    <section className={cn('min-w-0', className)} aria-label={title}>
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-border pb-3">
        <div>
          <h2 className="text-h2 text-text">{title}</h2>
          {description ? <p className="mt-0.5 text-small text-text-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

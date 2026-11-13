import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="min-w-0 max-w-prose">
        {eyebrow ? <p className="mb-2 text-eyebrow text-text-subtle">{eyebrow}</p> : null}
        <h1 className="text-title text-text">{title}</h1>
        {description ? <p className="mt-2 text-body-lg text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

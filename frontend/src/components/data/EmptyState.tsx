import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="flex size-10 items-center justify-center rounded-full bg-surface-muted">
        <Icon className="size-5 text-text-subtle" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-4 text-h3 text-text">{title}</p>
      {description ? <p className="mt-1 max-w-80 text-body text-text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

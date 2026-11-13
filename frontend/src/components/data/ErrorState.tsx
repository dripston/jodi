import { CircleAlert, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/** Inline error; polling continues in the background, so it clears itself on recovery. */
export function ErrorState({
  title = 'Could not load this',
  description = 'We will keep trying every few seconds.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex items-center gap-3 rounded border border-red-border bg-red-bg px-4 py-3', className)}
    >
      <CircleAlert className="size-4 shrink-0 text-red-fg" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-red-fg">{title}</p>
        <p className="text-small text-text-muted">{description}</p>
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry} icon={<RotateCw strokeWidth={1.75} />}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

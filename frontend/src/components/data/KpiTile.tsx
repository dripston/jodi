import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

interface KpiTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  loading?: boolean;
  className?: string;
}

/** Borderless metric cell; place several inside one Card with dividers. */
export function KpiTile({ label, value, sub, loading, className }: KpiTileProps) {
  return (
    <div className={cn('min-w-0 p-5 md:p-6', className)}>
      <p className="text-small text-text-muted">{label}</p>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-9 w-20" />
          <Skeleton className="mt-2 h-4 w-32" />
        </>
      ) : (
        <>
          <p className="tabular mt-2 text-display text-text">{value}</p>
          {sub ? <div className="mt-1.5 text-small text-text-subtle">{sub}</div> : null}
        </>
      )}
    </div>
  );
}

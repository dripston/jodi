import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface KpiTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  loading?: boolean;
}

export function KpiTile({ label, value, sub, loading }: KpiTileProps) {
  return (
    <Card className="p-5">
      <p className="text-small text-text-muted">{label}</p>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-9 w-20" />
          <Skeleton className="mt-2 h-4 w-32" />
        </>
      ) : (
        <>
          <p className="tabular mt-1 text-display text-text">{value}</p>
          {sub ? <div className="mt-1 text-small text-text-muted">{sub}</div> : null}
        </>
      )}
    </Card>
  );
}

import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Audit } from '@/api/schemas';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

interface ChainBadgeProps {
  audit: Audit | undefined;
  loading?: boolean;
  className?: string;
}

export function ChainBadge({ audit, loading, className }: ChainBadgeProps) {
  if (loading || !audit) return <Skeleton className="h-6 w-48" />;
  const ok = audit.valid;
  const Icon = ok ? ShieldCheck : ShieldAlert;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-small font-medium',
        ok ? 'text-green-fg' : 'text-red-fg',
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      {ok
        ? `Record verified · ${audit.entries} entries`
        : `Record altered at entry #${audit.broken_at ?? '?'}`}
    </span>
  );
}

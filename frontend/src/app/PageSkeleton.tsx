import { Skeleton } from '@/components/ui/Skeleton';

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded" />
        ))}
      </div>
      <Skeleton className="mt-6 h-80 rounded" />
    </div>
  );
}

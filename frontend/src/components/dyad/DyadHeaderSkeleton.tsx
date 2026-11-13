import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export function DyadHeaderSkeleton() {
  return (
    <Card className="flex flex-col gap-0 md:flex-row">
      {[0, 1].map((i) => (
        <div key={i} className="flex-1 space-y-3 p-5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-5 w-32" />
        </div>
      ))}
    </Card>
  );
}

import { useMotherCalls } from '@/api/queries';
import { ErrorState } from '@/components/data/ErrorState';
import { Card } from '@/components/ui/Card';
import { CallsTable } from '@/features/calls/CallsTable';

export function CallsTab({ motherId }: { motherId: string }) {
  const { data, isLoading, isError, refetch } = useMotherCalls(motherId);
  return (
    <div className="space-y-4">
      {isError ? <ErrorState onRetry={() => void refetch()} /> : null}
      <Card className="overflow-hidden">
        <CallsTable calls={data} loading={isLoading} showMother={false} />
      </Card>
    </div>
  );
}

import { useRecentCalls } from '@/api/queries';
import { useMotherIndex } from '@/api/useMotherIndex';
import { ErrorState } from '@/components/data/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CallsTable } from './CallsTable';

export function CallsPage() {
  const { data, isLoading, isError, refetch } = useRecentCalls();
  const mothers = useMotherIndex();
  return (
    <>
      <PageHeader title="Calls" description="The last 20 calls Jodi placed or received. Open a call to read the transcript." />
      {isError ? <ErrorState className="mb-4" onRetry={() => void refetch()} /> : null}
      <Card className="overflow-hidden">
        <CallsTable calls={data} loading={isLoading} mothers={mothers} />
      </Card>
    </>
  );
}

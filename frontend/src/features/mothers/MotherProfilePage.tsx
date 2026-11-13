import { ArrowLeft, UserX } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMother } from '@/api/queries';
import { useAshaIndex } from '@/api/useMotherIndex';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { DyadHeader } from '@/components/dyad/DyadHeader';
import { DyadHeaderSkeleton } from '@/components/dyad/DyadHeaderSkeleton';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AlertsTab } from './profile/AlertsTab';
import { CallsTab } from './profile/CallsTab';
import { DetailsTab } from './profile/DetailsTab';
import { ProfileRail } from './profile/ProfileRail';
import { TimelineTab } from './profile/TimelineTab';
import { VitalsTab } from './profile/VitalsTab';

export function MotherProfilePage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useMother(id);
  const ashas = useAshaIndex();

  if (isError && !data) {
    const notFound = 'status' in error && error.status === 404;
    return notFound ? (
      <EmptyState
        icon={UserX}
        title="We could not find this mother"
        description="She may have been removed after a demo reset."
        action={<Button asChild><Link to="/mothers">Back to mothers</Link></Button>}
      />
    ) : (
      <ErrorState onRetry={() => void refetch()} />
    );
  }

  const asha = data?.mother.asha_id ? ashas.get(data.mother.asha_id) : undefined;
  return (
    <div className="space-y-6">
      <Link to="/mothers" className="inline-flex items-center gap-1.5 text-small text-text-muted hover:text-text">
        <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        All mothers
      </Link>
      {isLoading || !data ? <DyadHeaderSkeleton /> : <DyadHeader mother={data.mother} baby={data.baby} asha={asha} pulse />}
      {data ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <Tabs defaultValue="timeline" className="min-w-0 flex-1">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="calls">Calls</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline"><TimelineTab motherId={id} deliveryDate={data.mother.delivery_date} /></TabsContent>
            <TabsContent value="vitals"><VitalsTab motherId={id} /></TabsContent>
            <TabsContent value="alerts"><AlertsTab mother={data.mother} /></TabsContent>
            <TabsContent value="calls"><CallsTab motherId={id} /></TabsContent>
            <TabsContent value="details"><DetailsTab mother={data.mother} baby={data.baby} asha={asha} /></TabsContent>
          </Tabs>
          <ProfileRail mother={data.mother} />
        </div>
      ) : null}
    </div>
  );
}

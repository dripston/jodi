import { UserX } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMother, useOpenTickets } from '@/api/queries';
import { useAshaIndex } from '@/api/useMotherIndex';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { DyadHeader } from '@/components/dyad/DyadHeader';
import { DyadHeaderSkeleton } from '@/components/dyad/DyadHeaderSkeleton';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AlertsTab } from './profile/AlertsTab';
import { CallsTab } from './profile/CallsTab';
import { CarePlanTab } from './profile/CarePlanTab';
import { DetailsTab } from './profile/DetailsTab';
import { HospitalsTab } from './profile/HospitalsTab';
import { ProfileRail } from './profile/ProfileRail';
import { TimelineTab } from './profile/TimelineTab';
import { VitalsTab } from './profile/VitalsTab';

export function MotherProfilePage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useMother(id);
  const ashas = useAshaIndex();
  const tickets = useOpenTickets();
  const red = tickets.data?.some((t) => t.mother_id === id && t.level === 'red') ?? false;

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
    <div className="space-y-8">
      {isLoading || !data ? <DyadHeaderSkeleton /> : <DyadHeader mother={data.mother} baby={data.baby} asha={asha} pulse />}
      {data ? (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <Tabs key={red ? 'red' : 'calm'} defaultValue={red ? 'hospitals' : 'timeline'} className="min-w-0 flex-1">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="care-plan">Care plan</TabsTrigger>
              <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="calls">Calls</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline"><TimelineTab motherId={id} deliveryDate={data.mother.delivery_date} today={data.mother.day_since_delivery} /></TabsContent>
            <TabsContent value="care-plan"><CarePlanTab motherId={id} /></TabsContent>
            <TabsContent value="hospitals"><HospitalsTab motherId={id} /></TabsContent>
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

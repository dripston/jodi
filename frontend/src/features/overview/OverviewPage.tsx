import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { useTickets } from '@/api/queries';
import { useMotherIndex } from '@/api/useMotherIndex';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast-store';
import { AlertList } from '@/features/alerts/AlertList';
import { KpiRow } from './KpiRow';
import { StatusByDayChart } from './StatusByDayChart';
import { TodayPanel } from './TodayPanel';

export function OverviewPage() {
  const tickets = useTickets('open');
  const mothers = useMotherIndex();
  const live = tickets.data?.filter((t) => t.state !== 'reached');
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={format(new Date(), 'EEEE, d MMMM')}
        title="How are our mothers and babies today?"
        description="Demo District · every enrolled family across the 42 days after delivery."
        actions={
          <Button icon={<Download strokeWidth={1.75} />} onClick={() => toast('Export is not available in the pilot yet')}>
            Export
          </Button>
        }
      />
      <KpiRow />
      <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
        <Section
          title="Needs attention now"
          description="Urgent first, then needs check today. Reached families drop off this list."
          className="lg:col-span-2"
        >
          <AlertList
            tickets={live}
            mothers={mothers}
            loading={tickets.isLoading}
            error={tickets.isError}
            onRetry={() => void tickets.refetch()}
            emptyTitle="Everyone is stable"
            emptyDescription="No mother or baby needs help right now."
            compact
          />
        </Section>
        <Section title="Today" description="Calls and ASHA work">
          <TodayPanel />
        </Section>
      </div>
      <StatusByDayChart />
    </div>
  );
}

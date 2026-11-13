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
  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Demo District · last 42 days"
        actions={
          <Button icon={<Download strokeWidth={1.75} />} onClick={() => toast('Export is not available in the pilot yet')}>
            Export
          </Button>
        }
      />
      <KpiRow />
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Needs attention now" description="Urgent first, then needs check today" className="lg:col-span-2">
          <AlertList
            tickets={tickets.data}
            mothers={mothers}
            loading={tickets.isLoading}
            error={tickets.isError}
            onRetry={() => void tickets.refetch()}
            emptyTitle="Everyone is stable"
            emptyDescription="No mother or baby needs help right now."
            compact
          />
        </Section>
        <Section title="Today" description="Calls and ASHA work across the district">
          <TodayPanel />
        </Section>
      </div>
      <StatusByDayChart />
    </div>
  );
}

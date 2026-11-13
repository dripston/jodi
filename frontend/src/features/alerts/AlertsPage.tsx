import { useTickets } from '@/api/queries';
import type { TicketState } from '@/api/schemas';
import { useMotherIndex } from '@/api/useMotherIndex';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AlertList } from './AlertList';

const TABS: { value: string; label: string; states: TicketState[]; empty: [string, string] }[] = [
  { value: 'open', label: 'Open', states: ['open', 'notified'], empty: ['No open alerts', 'When a rule flags a mother or baby, the alert appears here first.'] },
  { value: 'ack', label: 'Acknowledged', states: ['acknowledged', 'reached'], empty: ['Nothing in progress', 'Alerts move here once someone takes responsibility.'] },
  { value: 'closed', label: 'Closed', states: ['closed'], empty: ['No closed alerts yet', 'Alerts close only after the family is reached and a follow-up check is not urgent.'] },
];

export function AlertsPage() {
  const { data, isLoading, isError, refetch } = useTickets();
  const mothers = useMotherIndex();
  return (
    <>
      <PageHeader title="Alerts" description="Every alert stays open until a person confirms the mother or baby was reached." />
      <Tabs defaultValue="open">
        <TabsList>
          {TABS.map((t) => {
            const n = data?.filter((x) => t.states.includes(x.state)).length;
            return (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
                {n !== undefined ? <span className="tabular rounded-full bg-surface-muted px-1.5 text-caption text-text-muted">{n}</span> : null}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="max-w-content">
            <AlertList
              tickets={data?.filter((x) => t.states.includes(x.state))}
              mothers={mothers}
              loading={isLoading}
              error={isError}
              onRetry={() => void refetch()}
              emptyTitle={t.empty[0]}
              emptyDescription={t.empty[1]}
            />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Level, Source, TicketState } from '@/api/schemas';
import { TicketStepper } from '@/components/alerts/TicketStepper';
import { KpiTile } from '@/components/data/KpiTile';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChainBadge } from '@/components/status/ChainBadge';
import { RuleChip } from '@/components/status/RuleChip';
import { SourceBadge } from '@/components/status/SourceBadge';
import { StatusPill } from '@/components/status/StatusPill';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

const LEVELS: Level[] = ['green', 'amber', 'red'];
const SOURCES: Source[] = ['mother_reported', 'family_reported', 'asha_measured', 'doctor_verified', 'document_extracted', 'system'];
const STATES: TicketState[] = ['open', 'notified', 'acknowledged', 'reached', 'closed'];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="flex flex-wrap items-center gap-3">{children}</CardBody>
    </Card>
  );
}

/** Hidden review page: every status and identity variant side by side. */
export function ComponentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Components" description="Internal review page for visual consistency." />
      <Block title="Buttons">
        <Button variant="primary" icon={<Plus strokeWidth={1.75} />}>Primary</Button>
        <Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button loading>Saving</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
      </Block>
      <Block title="Status pills">
        {LEVELS.map((l) => <StatusPill key={l} level={l} />)}
        {LEVELS.map((l) => <StatusPill key={`s-${l}`} level={l} size="sm" subject="Baby" />)}
      </Block>
      <Block title="Source badges">
        {SOURCES.map((s) => <SourceBadge key={s} source={s} />)}
      </Block>
      <Block title="Rule chips">
        {['M-BLEED-01', 'M-HTN-05', 'B-FEED-02', 'D-INF-01', 'X-DISMISS-01'].map((r) => <RuleChip key={r} ruleId={r} />)}
      </Block>
      <Block title="Chain badge">
        <ChainBadge audit={{ valid: true, entries: 42, broken_at: null }} />
        <ChainBadge audit={{ valid: false, entries: 42, broken_at: 17 }} />
      </Block>
      <Card>
        <CardHeader title="Ticket stepper" />
        <CardBody className="space-y-6">
          {STATES.map((s) => <TicketStepper key={s} state={s} />)}
        </CardBody>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiTile label="Mothers enrolled" value="128" sub="96 within 42 days" />
        <KpiTile label="Median time to contact" value="6.5 min" sub="From flag to a person reached" />
        <KpiTile label="Loading" value="" loading />
      </div>
    </div>
  );
}

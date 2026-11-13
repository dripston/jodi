import { PhoneIncoming, PhoneOff, PhoneOutgoing } from 'lucide-react';
import { useState } from 'react';
import type { CallLog, Mother } from '@/api/schemas';
import { DataTable, type Column } from '@/components/data/DataTable';
import { EmptyState } from '@/components/data/EmptyState';
import { formatDuration, formatTime, formatWhen } from '@/lib/format';
import { PURPOSE_LABELS } from '@/lib/labels';
import { CallDetailDrawer } from './CallDetailDrawer';
import { OutcomeBadge } from './OutcomeBadge';

interface CallsTableProps {
  calls: CallLog[] | undefined;
  loading: boolean;
  mothers?: Map<string, Mother>;
  showMother?: boolean;
}

export function CallsTable({ calls, loading, mothers, showMother = true }: CallsTableProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const columns: Column<CallLog>[] = [
    {
      key: 'time',
      header: 'When',
      className: 'w-32',
      cell: (c) => (
        <div>
          <p className="tabular text-body text-text">{formatTime(c.started_at)}</p>
          <p className="text-small text-text-subtle">{formatWhen(c.started_at)}</p>
        </div>
      ),
    },
    {
      key: 'call',
      header: showMother ? 'Mother · purpose' : 'Purpose',
      cell: (c) => {
        const Icon = c.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
        return (
          <div className="flex items-center gap-3">
            <Icon className="size-4 shrink-0 text-text-subtle" strokeWidth={1.75} aria-label={c.direction === 'inbound' ? 'Inbound' : 'Outbound'} />
            <div className="min-w-0">
              {showMother ? <p className="text-body font-medium text-text">{mothers?.get(c.mother_id)?.name ?? '—'}</p> : null}
              <p className={showMother ? 'text-small text-text-muted' : 'text-body text-text'}>{PURPOSE_LABELS[c.purpose]}</p>
            </div>
          </div>
        );
      },
    },
    { key: 'summary', header: 'What happened', hideBelow: 'lg', className: 'max-w-80', cell: (c) => <p className="line-clamp-2 text-small text-text-muted">{c.summary ?? '—'}</p> },
    { key: 'duration', header: 'Length', hideBelow: 'sm', className: 'tabular w-20 text-text-muted', cell: (c) => (c.answered ? formatDuration(c.duration_seconds) : '—') },
    { key: 'outcome', header: 'Outcome', className: 'w-40', cell: (c) => <OutcomeBadge outcome={c.outcome} /> },
  ];
  return (
    <>
      <DataTable
        columns={columns}
        rows={calls}
        loading={loading}
        rowKey={(c) => c.interaction_id}
        rowLabel={(c) => `Open call from ${formatWhen(c.started_at)}`}
        onRowClick={(c) => setSelected(c.interaction_id)}
        selectedKey={selected}
        rowClassName={(c) => (c.outcome === 'red_flag' ? 'shadow-urgent-row' : undefined)}
        empty={<EmptyState icon={PhoneOff} title="No calls yet" description="Calls appear here as soon as Jodi places or receives them." />}
      />
      <CallDetailDrawer interactionId={selected} mothers={mothers} onClose={() => setSelected(null)} />
    </>
  );
}

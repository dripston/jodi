import { PhoneIncoming, PhoneOff, PhoneOutgoing } from 'lucide-react';
import { useState } from 'react';
import type { CallLog, Mother } from '@/api/schemas';
import { DataTable, type Column } from '@/components/data/DataTable';
import { EmptyState } from '@/components/data/EmptyState';
import { formatDuration, formatWhen } from '@/lib/format';
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
    { key: 'time', header: 'Time', className: 'w-36 text-text-muted', cell: (c) => formatWhen(c.started_at) },
    ...(showMother
      ? [{ key: 'mother', header: 'Mother', className: 'font-medium', cell: (c: CallLog) => mothers?.get(c.mother_id)?.name ?? '—' }]
      : []),
    { key: 'purpose', header: 'Purpose', cell: (c) => PURPOSE_LABELS[c.purpose] },
    {
      key: 'direction',
      header: 'Direction',
      cell: (c) => {
        const Icon = c.direction === 'inbound' ? PhoneIncoming : PhoneOutgoing;
        return (
          <span className="inline-flex items-center gap-1.5 text-text-muted">
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
            {c.direction === 'inbound' ? 'Inbound' : 'Outbound'}
          </span>
        );
      },
    },
    { key: 'duration', header: 'Duration', className: 'tabular text-text-muted', cell: (c) => (c.answered ? formatDuration(c.duration_seconds) : '—') },
    { key: 'outcome', header: 'Outcome', cell: (c) => <OutcomeBadge outcome={c.outcome} /> },
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
        empty={<EmptyState icon={PhoneOff} title="No calls yet" description="Calls appear here as soon as Jodi places or receives them." />}
      />
      <CallDetailDrawer interactionId={selected} mothers={mothers} onClose={() => setSelected(null)} />
    </>
  );
}

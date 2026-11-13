import { ArrowRight, ScrollText } from 'lucide-react';
import type { Entry } from '@/api/schemas';
import { DataTable } from '@/components/data/DataTable';
import { EmptyState } from '@/components/data/EmptyState';
import { SourceBadge } from '@/components/status/SourceBadge';
import { cn } from '@/lib/cn';
import { dayOf } from '@/lib/dyad';
import { formatAbsolute, formatPhone, shortHash } from '@/lib/format';
import { factLabel } from '@/lib/labels';

interface Row {
  n: number;
  entry: Entry;
}

interface ChainTableProps {
  entries: Entry[] | undefined;
  brokenAt: number | null;
  loading: boolean;
  deliveryDate?: string;
}

/** Oldest first, so the chain reads top to bottom: each entry seals the one above it. */
export function ChainTable({ entries, brokenAt, loading, deliveryDate }: ChainTableProps) {
  const rows = entries?.slice().reverse().map((entry, i) => ({ n: i + 1, entry }));
  const broken = (n: number) => brokenAt !== null && n >= brokenAt;
  return (
    <DataTable<Row>
      rows={rows}
      loading={loading}
      rowKey={(r) => r.entry.id}
      rowClassName={(r) => (broken(r.n) ? 'bg-red-bg' : undefined)}
      empty={<EmptyState icon={ScrollText} title="No entries in this record yet" />}
      columns={[
        { key: 'n', header: '#', className: 'tabular w-12 text-text-subtle', cell: (r) => r.n },
        {
          key: 'time',
          header: 'Recorded',
          className: 'w-44',
          cell: (r) => (
            <div>
              {deliveryDate ? <p className="text-body text-text">Day {dayOf(r.entry.created_at, deliveryDate)}</p> : null}
              <p className="text-small text-text-subtle">{formatAbsolute(r.entry.created_at)}</p>
            </div>
          ),
        },
        {
          key: 'what',
          header: 'Entry',
          cell: (r) => (
            <div className="min-w-0">
              <p className="text-caption font-normal text-text-subtle">{r.entry.subject === 'baby' ? 'Baby' : 'Mother'}</p>
              <p className="text-body text-text">{r.entry.code ? factLabel(r.entry.code, r.entry.subject) : (r.entry.value ?? 'Note')}</p>
            </div>
          ),
        },
        {
          key: 'source',
          header: 'Source',
          hideBelow: 'sm',
          cell: (r) => (
            <div className="space-y-0.5">
              <SourceBadge source={r.entry.source} />
              {r.entry.source_phone ? <p className="tabular text-caption font-normal text-text-subtle">{formatPhone(r.entry.source_phone)}</p> : null}
            </div>
          ),
        },
        {
          key: 'hash',
          header: 'Seal (previous → this)',
          hideBelow: 'md',
          className: 'w-64',
          cell: (r) => (
            <span className={cn('inline-flex items-center gap-1.5 font-mono text-small', broken(r.n) ? 'text-red-fg' : 'text-text-muted')}>
              <span title={r.entry.prev_hash} className="text-text-subtle">{r.entry.prev_hash === 'GENESIS' ? 'start' : shortHash(r.entry.prev_hash)}</span>
              <ArrowRight className="size-3.5 text-text-subtle" strokeWidth={1.75} aria-label="seals" />
              <span title={r.entry.hash}>{shortHash(r.entry.hash)}</span>
            </span>
          ),
        },
      ]}
    />
  );
}

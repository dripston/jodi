import type { Entry } from '@/api/schemas';
import { DataTable } from '@/components/data/DataTable';
import { EmptyState } from '@/components/data/EmptyState';
import { SourceBadge } from '@/components/status/SourceBadge';
import { cn } from '@/lib/cn';
import { formatAbsolute, shortHash } from '@/lib/format';
import { factLabel } from '@/lib/labels';
import { ScrollText } from 'lucide-react';

interface Row {
  n: number;
  entry: Entry;
}

export function ChainTable({ entries, brokenAt, loading }: { entries: Entry[] | undefined; brokenAt: number | null; loading: boolean }) {
  const rows = entries?.slice().reverse().map((entry, i) => ({ n: i + 1, entry }));
  return (
    <DataTable<Row>
      rows={rows}
      loading={loading}
      rowKey={(r) => r.entry.id}
      empty={<EmptyState icon={ScrollText} title="No entries in this record yet" />}
      columns={[
        { key: 'n', header: 'Entry', className: 'tabular w-20 text-text-muted', cell: (r) => `#${r.n}` },
        { key: 'time', header: 'Time', className: 'w-48 text-text-muted', cell: (r) => formatAbsolute(r.entry.created_at) },
        { key: 'what', header: 'What', cell: (r) => (r.entry.code ? factLabel(r.entry.code, r.entry.subject) : (r.entry.value ?? 'Note')) },
        { key: 'source', header: 'Source', cell: (r) => <SourceBadge source={r.entry.source} /> },
        {
          key: 'hash',
          header: 'Hash',
          className: 'w-36',
          cell: (r) => (
            <code className={cn('font-mono text-small', brokenAt === r.n ? 'text-red-fg' : 'text-text-muted')} title={r.entry.hash}>
              {shortHash(r.entry.hash)}
            </code>
          ),
        },
      ]}
    />
  );
}

import type { Asha, Mother } from '@/api/schemas';
import type { Column } from '@/components/data/DataTable';
import { StatusPill } from '@/components/status/StatusPill';
import { babyName } from '@/lib/dyad';
import { formatGrams, formatWhen, maskPhone } from '@/lib/format';

export function motherColumns(ashas: Map<string, Asha>): Column<Mother>[] {
  return [
    {
      key: 'mother',
      header: 'Mother',
      cell: (m) => (
        <div>
          <p className="font-medium text-text">{m.name}</p>
          <p className="tabular text-small text-text-muted">{maskPhone(m.phone)}</p>
        </div>
      ),
    },
    {
      key: 'baby',
      header: 'Baby',
      cell: (m) =>
        m.baby ? (
          <div>
            <p className="text-text">{babyName(m.baby, m)}</p>
            {m.baby.birth_weight_grams !== null ? (
              <p className="tabular text-small text-text-muted">{formatGrams(m.baby.birth_weight_grams)} at birth</p>
            ) : null}
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'day', header: 'Day', className: 'tabular w-16', cell: (m) => m.day_since_delivery },
    {
      key: 'status',
      header: 'Status',
      cell: (m) => (
        <div className="flex flex-col items-start gap-1 py-2">
          <StatusPill level={m.status} subject="Mother" size="sm" />
          {m.baby ? <StatusPill level={m.baby.status} subject="Baby" size="sm" /> : null}
        </div>
      ),
    },
    { key: 'last', header: 'Last check-in', className: 'text-text-muted', cell: (m) => (m.last_checkin_at ? formatWhen(m.last_checkin_at) : '—') },
    { key: 'next', header: 'Next call', className: 'text-text-muted', cell: (m) => (m.next_call_at ? formatWhen(m.next_call_at) : '—') },
    { key: 'asha', header: 'ASHA', cell: (m) => (m.asha_id ? (ashas.get(m.asha_id)?.name ?? '—') : '—') },
  ];
}

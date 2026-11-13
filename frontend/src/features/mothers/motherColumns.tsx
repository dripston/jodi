import type { Asha, Mother } from '@/api/schemas';
import type { Column } from '@/components/data/DataTable';
import { StatusPill } from '@/components/status/StatusPill';
import { babyName } from '@/lib/dyad';
import { formatGrams, formatWhen, maskPhone } from '@/lib/format';
import { DayProgress } from './DayProgress';

export function motherColumns(ashas: Map<string, Asha>): Column<Mother>[] {
  return [
    {
      key: 'mother',
      header: 'Mother',
      cell: (m) => (
        <div className="min-w-0">
          <p className="text-body-lg font-medium text-text">
            {m.name}
            {m.risk_profile === 'high' ? <span className="ml-2 text-caption font-medium text-amber-fg">High risk</span> : null}
          </p>
          <p className="tabular text-small text-text-subtle">{maskPhone(m.phone)}</p>
        </div>
      ),
    },
    {
      key: 'baby',
      header: 'Baby',
      hideBelow: 'md',
      cell: (m) =>
        m.baby ? (
          <div>
            <p className="text-body text-text">{babyName(m.baby, m)}</p>
            {m.baby.birth_weight_grams !== null ? (
              <p className="tabular text-small text-text-subtle">{formatGrams(m.baby.birth_weight_grams)} at birth</p>
            ) : null}
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'day', header: 'Day of 42', className: 'w-32', cell: (m) => <DayProgress day={m.day_since_delivery} /> },
    {
      key: 'status',
      header: 'Mother · baby',
      cell: (m) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill level={m.status} subject="Mother" size="sm" />
          {m.baby ? <StatusPill level={m.baby.status} subject="Baby" size="sm" /> : null}
        </div>
      ),
    },
    { key: 'last', header: 'Last check-in', hideBelow: 'lg', className: 'text-text-muted', cell: (m) => (m.last_checkin_at ? formatWhen(m.last_checkin_at) : '—') },
    { key: 'next', header: 'Next call', hideBelow: 'lg', className: 'text-text-muted', cell: (m) => (m.next_call_at ? formatWhen(m.next_call_at) : '—') },
    { key: 'asha', header: 'ASHA', hideBelow: 'md', className: 'text-text-muted', cell: (m) => (m.asha_id ? (ashas.get(m.asha_id)?.name ?? '—') : '—') },
  ];
}

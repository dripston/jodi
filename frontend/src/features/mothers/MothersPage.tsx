import { SearchX } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAshas, useMothers } from '@/api/queries';
import type { MotherFilters as ApiFilters } from '@/api/endpoints';
import type { Mother } from '@/api/schemas';
import { DataTable } from '@/components/data/DataTable';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { motherColumns } from './motherColumns';
import { MotherFilters, type FilterState } from './MotherFilters';
import { MotherQuickView } from './MotherQuickView';

const INITIAL: FilterState = { status: 'all', days: 'all', asha: 'all', highRisk: false, q: '' };

function toApi(f: FilterState): ApiFilters {
  const [min, max] = f.days === 'all' ? [undefined, undefined] : f.days.split('-').map(Number);
  return {
    status: f.status === 'all' ? undefined : f.status,
    asha_id: f.asha === 'all' ? undefined : f.asha,
    high_risk: f.highRisk || undefined,
    q: f.q.trim() || undefined,
    day_min: min,
    day_max: max,
  };
}

export function MothersPage() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(INITIAL);
  const [selected, setSelected] = useState<Mother | null>(null);
  const { data, isLoading, isError, refetch } = useMothers(toApi(filters));
  const ashas = useAshas();
  const ashaMap = new Map((ashas.data ?? []).map((a) => [a.id, a]));

  return (
    <>
      <PageHeader title="Mothers" description="Every enrolled mother and baby, with today's status." />
      {isError ? <ErrorState className="mb-4" onRetry={() => void refetch()} /> : null}
      <Card className="overflow-hidden">
        <MotherFilters value={filters} onChange={setFilters} ashas={ashas.data ?? []} focusSearch={params.get('focus') === 'search'} />
        <DataTable
          columns={motherColumns(ashaMap)}
          rows={data}
          loading={isLoading}
          rowKey={(m) => m.id}
          rowLabel={(m) => `Open quick view for ${m.name}`}
          onRowClick={setSelected}
          selectedKey={selected?.id}
          empty={
            <EmptyState
              icon={SearchX}
              title="No mothers match these filters"
              description="Try a different status or day range, or clear the search."
            />
          }
        />
      </Card>
      <MotherQuickView mother={selected} asha={selected?.asha_id ? ashaMap.get(selected.asha_id) : undefined} onClose={() => setSelected(null)} />
    </>
  );
}

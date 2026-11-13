import { Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Asha } from '@/api/schemas';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';

export interface FilterState {
  status: 'all' | 'red' | 'amber' | 'green';
  days: 'all' | '0-7' | '8-21' | '22-42';
  asha: string;
  highRisk: boolean;
  q: string;
}

interface MotherFiltersProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  ashas: Asha[];
  focusSearch?: boolean;
}

export function MotherFilters({ value, onChange, ashas, focusSearch }: MotherFiltersProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusSearch) ref.current?.focus();
  }, [focusSearch]);
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" strokeWidth={1.75} aria-hidden />
        <Input ref={ref} aria-label="Search by name or last 4 digits" placeholder="Name or last 4 digits" className="pl-9" value={value.q} onChange={(e) => set('q', e.target.value)} />
      </div>
      <Select label="Status" value={value.status} onValueChange={(v) => set('status', v)} className="w-40" options={[
        { value: 'all', label: 'All statuses' }, { value: 'red', label: 'Urgent' }, { value: 'amber', label: 'Needs check today' }, { value: 'green', label: 'Stable' },
      ]} />
      <Select label="Day since delivery" value={value.days} onValueChange={(v) => set('days', v)} className="w-36" options={[
        { value: 'all', label: 'Days 0–42' }, { value: '0-7', label: 'Days 0–7' }, { value: '8-21', label: 'Days 8–21' }, { value: '22-42', label: 'Days 22–42' },
      ]} />
      <Select label="ASHA" value={value.asha} onValueChange={(v) => set('asha', v)} className="w-40" options={[
        { value: 'all', label: 'All ASHAs' }, ...ashas.map((a) => ({ value: a.id, label: a.name })),
      ]} />
      <button
        type="button"
        aria-pressed={value.highRisk}
        onClick={() => set('highRisk', !value.highRisk)}
        className={cn(
          'h-9 rounded-sm border px-3 text-body transition-colors duration-120',
          value.highRisk ? 'border-brand bg-brand-soft text-brand' : 'border-border-strong bg-surface text-text hover:bg-surface-muted',
        )}
      >
        High-risk only
      </button>
    </div>
  );
}

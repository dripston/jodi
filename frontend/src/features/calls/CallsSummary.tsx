import type { CallLog } from '@/api/schemas';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

function Cell({ label, value, tone }: { label: string; value: number; tone?: 'red' | 'amber' }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-small text-text-muted">{label}</p>
      <p className={cn('tabular mt-1 text-h1', tone === 'red' ? 'text-red-fg' : tone === 'amber' ? 'text-amber-fg' : 'text-text')}>{value}</p>
    </div>
  );
}

export function CallsSummary({ calls }: { calls: CallLog[] }) {
  const answered = calls.filter((c) => c.answered).length;
  return (
    <Card className="mb-6 grid grid-cols-2 gap-px overflow-hidden bg-border md:grid-cols-4">
      <Cell label="Calls shown" value={calls.length} />
      <Cell label="Answered" value={answered} />
      <Cell label="Raised urgent" value={calls.filter((c) => c.outcome === 'red_flag').length} tone="red" />
      <Cell label="Not answered" value={calls.length - answered} />
    </Card>
  );
}

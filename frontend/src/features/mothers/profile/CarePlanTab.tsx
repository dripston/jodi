import { CalendarClock, CheckCircle2, PhoneMissed, PhoneOutgoing } from 'lucide-react';
import { usePlannedCalls } from '@/api/queries';
import type { PlannedCall } from '@/api/schemas';
import { EmptyState } from '@/components/data/EmptyState';
import { ErrorState } from '@/components/data/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatAbsolute, formatWhen } from '@/lib/format';

const REASON: Record<string, string> = {
  milestone: 'Check-in',
  recheck: 'Re-check after an alert',
  retry: 'Retry (no answer)',
  missed_followup: 'Follow-up',
};

function statusBadge(status: string) {
  if (status === 'answered') return <Badge tone="green"><CheckCircle2 aria-hidden /> Done</Badge>;
  if (status === 'missed') return <Badge tone="amber"><PhoneMissed aria-hidden /> Missed</Badge>;
  if (status === 'placed') return <Badge tone="info"><PhoneOutgoing aria-hidden /> Calling</Badge>;
  if (status === 'cancelled') return <Badge tone="outline">Cancelled</Badge>;
  return <Badge tone="neutral"><CalendarClock aria-hidden /> Planned</Badge>;
}

function Row({ call }: { call: PlannedCall }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-3">
      <div className="min-w-0">
        <p className="text-body font-medium text-text">
          {call.day !== null ? `Day ${call.day}` : 'Extra call'} · {REASON[call.reason] ?? call.reason}
        </p>
        {call.due_at ? (
          <p className="text-small text-text-muted" title={formatAbsolute(call.due_at)}>
            {formatWhen(call.due_at)}
          </p>
        ) : null}
      </div>
      {statusBadge(call.status)}
    </li>
  );
}

/** Jodi's planned calls for her: milestone check-ins, re-checks after alerts, retries. */
export function CarePlanTab({ motherId }: { motherId: string }) {
  const { data, isLoading, isError, refetch } = usePlannedCalls(motherId);
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Jodi's calls for her" description="Planned from her delivery date and risk; alerts add re-checks" />
      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No calls planned yet" description="Calls are planned once her record is created." />
      ) : (
        <ul className="divide-y divide-border">
          {data.map((c) => (
            <Row key={c.id} call={c} />
          ))}
        </ul>
      )}
    </Card>
  );
}

import { CalendarClock } from 'lucide-react';
import { useMotherCalls } from '@/api/queries';
import type { Mother } from '@/api/schemas';
import { CallChip } from '@/components/status/CallChip';
import { Card, CardHeader } from '@/components/ui/Card';
import { formatAbsolute, formatWhen } from '@/lib/format';

export function NextCallCard({ mother }: { mother: Mother }) {
  const calls = useMotherCalls(mother.id);
  const last = calls.data?.[0];
  return (
    <Card>
      <CardHeader title="Calls" />
      <dl className="mt-3 divide-y divide-border border-t border-border">
        <div className="px-5 py-3">
          <dt className="text-small text-text-muted">Next scheduled call</dt>
          <dd className="mt-1 inline-flex items-center gap-1.5 text-body font-medium text-text">
            <CalendarClock className="size-4 text-text-muted" strokeWidth={1.75} aria-hidden />
            {mother.next_call_at ? `${formatWhen(mother.next_call_at)} · ${formatAbsolute(mother.next_call_at)}` : 'Not scheduled'}
          </dd>
        </div>
        {last ? (
          <div className="px-5 py-3">
            <dt className="text-small text-text-muted">Last call · {formatWhen(last.started_at)}</dt>
            <dd className="mt-1 space-y-1">
              <CallChip call={last} />
              {last.summary ? <p className="text-small text-text-muted">{last.summary}</p> : null}
            </dd>
          </div>
        ) : null}
      </dl>
    </Card>
  );
}

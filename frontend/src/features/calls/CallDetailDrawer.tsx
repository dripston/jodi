import { useCall } from '@/api/queries';
import type { Mother } from '@/api/schemas';
import { ErrorState } from '@/components/data/ErrorState';
import { CallChip } from '@/components/status/CallChip';
import { RuleChip } from '@/components/status/RuleChip';
import { Drawer } from '@/components/ui/Drawer';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatAbsolute } from '@/lib/format';
import { FactList } from './FactList';
import { OutcomeBadge } from './OutcomeBadge';
import { ChatTranscript } from './ChatTranscript';
import { Transcript } from './Transcript';

interface CallDetailDrawerProps {
  interactionId: string | null;
  mothers?: Map<string, Mother>;
  onClose: () => void;
}

export function CallDetailDrawer({ interactionId, mothers, onClose }: CallDetailDrawerProps) {
  const { data, isLoading, isError, refetch } = useCall(interactionId);
  const mother = data ? mothers?.get(data.call.mother_id) : undefined;
  return (
    <Drawer
      open={interactionId !== null}
      onOpenChange={(o) => !o && onClose()}
      title={mother ? `Call with ${mother.name}` : 'Call'}
      description={data ? formatAbsolute(data.call.started_at) : undefined}
    >
      {isError ? <ErrorState onRetry={() => void refetch()} /> : null}
      {isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <CallChip call={data.call} />
            <OutcomeBadge outcome={data.call.outcome} />
          </div>
          {data.call.summary ? <p className="text-body text-text">{data.call.summary}</p> : null}
          <section aria-label="Extracted facts">
            <h3 className="mb-2 text-h3 text-text">Facts heard</h3>
            <FactList facts={data.facts} />
            {data.rule_ids.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.rule_ids.map((r) => (
                  <RuleChip key={r} ruleId={r} />
                ))}
              </div>
            ) : null}
          </section>
          <section aria-label="Transcript">
            <h3 className="mb-2 text-h3 text-text">Transcript</h3>
            {data.turns.length ? (
              <ChatTranscript turns={data.turns} highlights={data.facts.map((f) => f.quote)} />
            ) : data.transcript ? (
              <Transcript text={data.transcript} highlights={data.facts.map((f) => f.quote)} />
            ) : (
              <p className="text-small text-text-muted">The conversation appears here a few seconds after the call ends.</p>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAudit, useMothers, useTimeline } from '@/api/queries';
import { ChainBadge } from '@/components/status/ChainBadge';
import { ErrorState } from '@/components/data/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { ChainTable } from './ChainTable';

export function AuditPage() {
  const mothers = useMothers();
  const [motherId, setMotherId] = useState('');
  useEffect(() => {
    const list = mothers.data ?? [];
    const first = list[0];
    if (first && !list.some((m) => m.id === motherId)) setMotherId(first.id);
  }, [mothers.data, motherId]);
  const audit = useAudit(motherId);
  const timeline = useTimeline(motherId);
  const [verifiedAt, setVerifiedAt] = useState<Date | null>(null);
  const result = audit.data;

  const verify = async () => {
    await audit.refetch();
    setVerifiedAt(new Date());
  };

  return (
    <>
      <PageHeader
        title="Record log"
        description="Every entry is sealed to the one before it. If anyone edits a past entry, the seal breaks and the record shows exactly where."
        actions={
          <>
            <Select
              label="Mother"
              value={motherId}
              onValueChange={(v) => {
                setMotherId(v);
                setVerifiedAt(null);
              }}
              className="w-44"
              options={(mothers.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
            />
            <Button variant="primary" icon={<ShieldCheck strokeWidth={1.75} />} loading={audit.isFetching && verifiedAt === null} onClick={() => void verify()}>
              Verify record
            </Button>
          </>
        }
      />
      {audit.isError ? <ErrorState className="mb-4" onRetry={() => void audit.refetch()} /> : null}
      {result && verifiedAt ? (
        <div
          role="status"
          className={cn(
            'mb-4 flex items-center gap-3 rounded border px-4 py-3',
            result.valid ? 'border-green-border bg-green-bg text-green-fg' : 'border-red-border bg-red-bg text-red-fg',
          )}
        >
          {result.valid ? <ShieldCheck className="size-5" strokeWidth={1.75} aria-hidden /> : <ShieldAlert className="size-5" strokeWidth={1.75} aria-hidden />}
          <p className="text-body font-medium">
            {result.valid
              ? `Record verified. All ${result.entries} entries are intact.`
              : `Record altered at entry #${result.broken_at ?? '?'}. Entries after it cannot be trusted.`}
          </p>
          <span className="ml-auto text-small opacity-80">Checked {verifiedAt.toLocaleTimeString('en-IN')}</span>
        </div>
      ) : null}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <p className="text-h3 text-text">{mothers.data?.find((m) => m.id === motherId)?.name ?? 'Record'}</p>
          <ChainBadge audit={result} loading={audit.isLoading} />
        </div>
        <ChainTable
          entries={timeline.data}
          brokenAt={result?.broken_at ?? null}
          loading={timeline.isLoading}
          deliveryDate={mothers.data?.find((m) => m.id === motherId)?.delivery_date}
        />
      </Card>
    </>
  );
}

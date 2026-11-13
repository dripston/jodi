import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAudit, useMothers, useTimeline } from '@/api/queries';
import { ErrorState } from '@/components/data/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { ChainTable } from './ChainTable';

export function AuditPage() {
  const mothers = useMothers();
  const [motherId, setMotherId] = useState('m_001');
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
        description="Every entry is sealed in a hash chain. Any change to a past entry breaks the chain."
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
        <ChainTable entries={timeline.data} brokenAt={result?.broken_at ?? null} loading={timeline.isLoading} />
      </Card>
    </>
  );
}

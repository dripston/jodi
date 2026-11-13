import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import type { SharedRecord } from '@/api/schemas';
import { Logo } from '@/components/layout/Logo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { formatAbsolute, formatGrams } from '@/lib/format';
import { complicationLabel, DELIVERY_LABELS } from '@/lib/labels';

const LEVEL_TONE = { red: 'red', amber: 'amber', green: 'green' } as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-small text-text-muted">{label}</dt>
      <dd className="text-body text-text">{children}</dd>
    </div>
  );
}

function RecordView({ record }: { record: SharedRecord }) {
  const m = record.mother;
  const lastBp = record.vitals.bp.at(-1);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={m.name}
          description={m.day_since_delivery !== null ? `Day ${m.day_since_delivery} after delivery` : undefined}
          actions={
            record.record_verified ? (
              <Badge tone="green" title="Every entry is hash-chained; none has been changed or removed">
                <ShieldCheck aria-hidden /> Record verified ({record.entries} entries)
              </Badge>
            ) : (
              <Badge tone="red">
                <AlertTriangle aria-hidden /> Record integrity check failed
              </Badge>
            )
          }
        />
        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Fact label="Delivery">
              {m.delivery_date ?? 'Unknown'}
              {m.delivery_type ? ` · ${DELIVERY_LABELS[m.delivery_type as keyof typeof DELIVERY_LABELS] ?? m.delivery_type}` : ''}
            </Fact>
            <Fact label="In pregnancy">
              {m.complications.length ? m.complications.map(complicationLabel).join(', ') : 'None recorded'}
            </Fact>
            <Fact label="Baby">
              {record.baby.birth_weight_grams ? formatGrams(record.baby.birth_weight_grams) : 'Weight unknown'}
              {record.baby.gestation_weeks ? ` · born at ${record.baby.gestation_weeks} weeks` : ''}
            </Fact>
            {lastBp ? (
              <Fact label="Last BP">
                {lastBp.systolic}/{lastBp.diastolic} <span className="text-small text-text-muted">({formatAbsolute(lastBp.at)})</span>
              </Fact>
            ) : null}
          </dl>
        </CardBody>
      </Card>

      {record.alert ? (
        <Card>
          <CardHeader
            title="Why she came"
            actions={<Badge tone={LEVEL_TONE[record.alert.level as keyof typeof LEVEL_TONE] ?? 'neutral'}>{record.alert.level.toUpperCase()}</Badge>}
          />
          <CardBody className="space-y-2">
            <p className="text-body text-text">{record.alert.reason}</p>
            <p className="text-small text-text-muted">Rules: {record.alert.rule_ids.join(', ')}</p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Danger signs reported" description="Newest first, with the rule each one triggered" />
        <ul className="divide-y divide-border">
          {record.danger_signs.length === 0 ? (
            <li className="px-5 py-3 text-body text-text-muted">None reported.</li>
          ) : (
            record.danger_signs.map((d, i) => (
              <li key={`${d.at}-${i}`} className="flex items-start justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-body text-text">{d.what} <span className="text-text-muted">({d.subject})</span></p>
                  <p className="text-small text-text-muted">{formatAbsolute(d.at)} · {d.source.replace('_', ' ')}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {d.rule_ids.map((r) => (
                    <Badge key={r} tone="outline">{r}</Badge>
                  ))}
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Medicines" />
        <ul className="divide-y divide-border">
          {record.medicines.length === 0 ? (
            <li className="px-5 py-3 text-body text-text-muted">None recorded.</li>
          ) : (
            record.medicines.map((md, i) => (
              <li key={`${md.at}-${i}`} className="px-5 py-3 text-body text-text">{md.what}</li>
            ))
          )}
        </ul>
      </Card>
      <p className="text-center text-caption text-text-subtle">
        Read-only view shared by her family through Jodi. This view is logged and her family is told it was opened.
      </p>
    </div>
  );
}

/** Public page for the treating doctor: one-time code → read-only record (30 minutes). */
export function SharePage() {
  const { token = '' } = useParams();
  const [code, setCode] = useState('');
  const [session, setSession] = useState<string | null>(null);
  const verify = useMutation({
    mutationFn: () => api.verifyShare(token, code.trim()),
    onSuccess: (r) => setSession(r.session),
  });
  const record = useQuery({
    queryKey: ['jodi', 'shared', token, session],
    queryFn: () => api.getSharedRecord(token, session ?? ''),
    enabled: session !== null,
    retry: false,
  });
  const expired = record.error instanceof ApiError && record.error.status === 403;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="text-small text-text-muted">Shared health record</span>
      </div>
      {session && record.data ? (
        <RecordView record={record.data} />
      ) : (
        <Card>
          <CardHeader title="Enter the one-time code" description="The family received a 6-digit code with this link. Ask them for it." />
          <CardBody className="space-y-3">
            <div className="flex gap-2">
              <Input
                aria-label="One-time code"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                className="tabular w-40 text-center text-h3 tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <Button
                variant="primary"
                icon={<KeyRound strokeWidth={1.75} />}
                disabled={code.length !== 6}
                loading={verify.isPending || record.isLoading}
                onClick={() => verify.mutate()}
              >
                Open record
              </Button>
            </div>
            {verify.isError || expired ? (
              <p className="text-small text-red-fg">
                That code did not work. It may be wrong, already used or expired; ask the family to send a new one.
              </p>
            ) : null}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

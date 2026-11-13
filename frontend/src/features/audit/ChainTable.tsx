import { AlertTriangle, Check, CircleDot, FileText, Link2, Pill, ScrollText, ShieldAlert, Siren } from 'lucide-react';
import type { Entry } from '@/api/schemas';
import { EmptyState } from '@/components/data/EmptyState';
import { RuleChip } from '@/components/status/RuleChip';
import { SourceBadge } from '@/components/status/SourceBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { dayOf } from '@/lib/dyad';
import { formatAbsolute, formatPhone, formatTime, shortHash } from '@/lib/format';
import { entryLabel } from '@/lib/labels';

interface ChainTableProps {
  entries: Entry[] | undefined;
  brokenAt: number | null;
  loading: boolean;
  deliveryDate?: string;
}

type Tone = 'green' | 'amber' | 'red' | 'neutral' | 'broken';

const NODE: Record<Tone, string> = {
  green: 'bg-green-bg text-green-fg ring-green-fg/40',
  amber: 'bg-amber-bg text-amber-fg ring-amber-border',
  red: 'bg-red-bg text-red-fg ring-red-border',
  neutral: 'bg-surface-muted text-text-muted ring-border-strong',
  broken: 'bg-red-fg text-white ring-red-fg',
};

const CARD: Record<Tone, string> = {
  green: 'border-l-green-fg',
  amber: 'border-l-amber-fg',
  red: 'border-l-red-fg',
  neutral: 'border-l-border-strong',
  broken: 'border-l-red-fg bg-red-bg',
};

const LEVEL_TEXT = { green: 'Normal', amber: 'Check today', red: 'Urgent' } as const;

function toneOf(entry: Entry, broken: boolean): Tone {
  if (broken) return 'broken';
  return entry.level ?? 'neutral';
}

function NodeIcon({ entry, tone }: { entry: Entry; tone: Tone }) {
  const cls = 'size-4';
  if (tone === 'broken') return <ShieldAlert className={cls} strokeWidth={2} aria-hidden />;
  if (tone === 'red') return <Siren className={cls} strokeWidth={2} aria-hidden />;
  if (tone === 'amber') return <AlertTriangle className={cls} strokeWidth={2} aria-hidden />;
  if (tone === 'green') return <Check className={cls} strokeWidth={2.5} aria-hidden />;
  if (entry.kind === 'medicine') return <Pill className={cls} strokeWidth={1.75} aria-hidden />;
  if (entry.kind === 'note' || entry.kind === 'onboarding') return <FileText className={cls} strokeWidth={1.75} aria-hidden />;
  return <CircleDot className={cls} strokeWidth={1.75} aria-hidden />;
}

function Checkpoint({ entry, n, broken, last }: { entry: Entry; n: number; broken: boolean; last: boolean }) {
  const tone = toneOf(entry, broken);
  return (
    <li className="relative grid grid-cols-[2.25rem_1fr] gap-x-3 pb-3">
      {!last ? (
        <span
          aria-hidden
          className={cn('absolute left-[1.0625rem] top-9 h-[calc(100%-1.5rem)] w-0.5', broken ? 'bg-red-fg' : 'bg-green-fg/40')}
        />
      ) : null}
      <span className={cn('relative z-10 flex size-9 items-center justify-center rounded-full ring-2', NODE[tone])}>
        <NodeIcon entry={entry} tone={tone} />
      </span>
      <div className={cn('min-w-0 rounded border border-border border-l-4 bg-surface px-4 py-3 shadow-raised', CARD[tone])}>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <p className="text-caption text-text-subtle">
              #{n} · {entry.subject === 'baby' ? 'Baby' : 'Mother'} · {entry.kind}
            </p>
            <p className="text-body-lg font-medium text-text">{entryLabel(entry)}</p>
          </div>
          <div className="flex items-center gap-2">
            {entry.level ? (
              <span
                className={cn(
                  'rounded-sm px-1.5 py-0.5 text-caption font-medium',
                  entry.level === 'green' && 'bg-green-bg text-green-fg',
                  entry.level === 'amber' && 'bg-amber-bg text-amber-fg',
                  entry.level === 'red' && 'bg-red-bg text-red-fg',
                )}
              >
                {LEVEL_TEXT[entry.level]}
              </span>
            ) : null}
            <time dateTime={entry.created_at} title={formatAbsolute(entry.created_at)} className="tabular text-small text-text-subtle">
              {formatTime(entry.created_at)}
            </time>
          </div>
        </div>
        {entry.quote ? <p className="mt-1 text-small italic text-text-muted">“{entry.quote}”</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <SourceBadge source={entry.source} />
          {entry.source_phone ? <span className="tabular text-caption text-text-subtle">{formatPhone(entry.source_phone)}</span> : null}
          {entry.rule_ids?.map((r) => <RuleChip key={r} ruleId={r} />)}
          <span
            className={cn('ml-auto inline-flex items-center gap-1 font-mono text-caption', broken ? 'text-red-fg' : 'text-text-subtle')}
            title={`${entry.prev_hash} → ${entry.hash}`}
          >
            <Link2 className="size-3.5" strokeWidth={1.75} aria-label="sealed to the previous entry" />
            {entry.prev_hash === 'GENESIS' ? 'start' : shortHash(entry.prev_hash)} → {shortHash(entry.hash)}
          </span>
        </div>
      </div>
    </li>
  );
}

function Summary({ rows }: { rows: Entry[] }) {
  const count = (l: 'green' | 'amber' | 'red') => rows.filter((e) => e.level === l).length;
  const items = [
    { label: 'Normal', n: count('green'), cls: 'bg-green-bg text-green-fg' },
    { label: 'Check today', n: count('amber'), cls: 'bg-amber-bg text-amber-fg' },
    { label: 'Urgent', n: count('red'), cls: 'bg-red-bg text-red-fg' },
    { label: 'Notes, medicines, details', n: rows.filter((e) => !e.level).length, cls: 'bg-surface-muted text-text-muted' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 px-5 pt-4 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className={cn('rounded px-3 py-2', i.cls)}>
          <p className="tabular text-h3">{i.n}</p>
          <p className="text-caption">{i.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Oldest first, so the chain reads top to bottom: each checkpoint is sealed to the one above it. */
export function ChainTable({ entries, brokenAt, loading, deliveryDate }: ChainTableProps) {
  if (loading && !entries) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }
  const rows = entries?.slice().reverse() ?? [];
  if (rows.length === 0) return <EmptyState icon={ScrollText} title="No entries in this record yet" />;
  const isBroken = (n: number) => brokenAt !== null && n >= brokenAt;

  const groups: { label: string; items: { entry: Entry; n: number }[] }[] = [];
  rows.forEach((entry, i) => {
    const label = deliveryDate
      ? `Day ${dayOf(entry.created_at, deliveryDate)} · ${new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      : new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const g = groups.at(-1);
    if (g && g.label === label) g.items.push({ entry, n: i + 1 });
    else groups.push({ label, items: [{ entry, n: i + 1 }] });
  });

  return (
    <div className="pb-2">
      <Summary rows={rows} />
      {groups.map((g, gi) => (
        <section key={g.label} className="px-5 pt-5">
          <h3 className="mb-3 text-eyebrow text-text-subtle">{g.label}</h3>
          <ol>
            {g.items.map(({ entry, n }, i) => (
              <Checkpoint
                key={entry.id}
                entry={entry}
                n={n}
                broken={isBroken(n)}
                last={gi === groups.length - 1 && i === g.items.length - 1}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

import { Baby, User } from 'lucide-react';
import type { Entry } from '@/api/schemas';
import { RuleChip } from '@/components/status/RuleChip';
import { SourceBadge } from '@/components/status/SourceBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import { isStrongSource } from '@/lib/clinical';
import { cn } from '@/lib/cn';
import { formatAbsolute, formatGrams, formatTime, formatWhen } from '@/lib/format';
import { factLabel, KIND_LABELS } from '@/lib/labels';

function detail(entry: Entry): string | null {
  if (entry.code === 'weight_grams' && entry.numeric_value !== null) {
    return `${formatGrams(entry.numeric_value)}${entry.value ? ` · ${entry.value}` : ''}`;
  }
  if (!entry.code || entry.value === factLabel(entry.code, entry.subject)) return null;
  return entry.value;
}

interface TimelineItemProps {
  entry: Entry;
  isNew?: boolean;
  showSubject?: boolean;
}

/** Measured and verified entries get a filled marker and heavier type; reported ones stay lighter. */
export function TimelineItem({ entry, isNew, showSubject = true }: TimelineItemProps) {
  const strong = isStrongSource(entry.source);
  const SubjectIcon = entry.subject === 'baby' ? Baby : User;
  const title = entry.code ? factLabel(entry.code, entry.subject) : (entry.value ?? 'Note');
  const sub = detail(entry);
  return (
    <li className={cn('relative grid grid-cols-[2rem_1fr] gap-x-3 rounded py-3 pr-2', isNew && 'animate-entry-in')}>
      <span
        aria-hidden
        className={cn(
          'relative z-10 mt-0.5 flex size-8 items-center justify-center rounded-full ring-4 ring-surface',
          strong ? 'bg-brand text-white' : 'border border-border-strong bg-surface text-text-muted',
        )}
      >
        <SubjectIcon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            {showSubject ? (
              <p className="text-eyebrow text-text-subtle">
                {entry.subject === 'baby' ? 'Baby' : 'Mother'} · {KIND_LABELS[entry.kind].toLowerCase()}
              </p>
            ) : null}
            <p className={cn('mt-0.5 text-body-lg text-text', strong ? 'font-semibold' : 'font-medium')}>{title}</p>
          </div>
          <Tooltip content={formatAbsolute(entry.created_at)}>
            <button type="button" className="shrink-0 cursor-default pt-0.5 text-right text-small text-text-subtle">
              <time dateTime={entry.created_at} className="tabular block">{formatTime(entry.created_at)}</time>
              <span className="block text-caption font-normal">{formatWhen(entry.created_at)}</span>
            </button>
          </Tooltip>
        </div>
        {sub ? <p className="tabular mt-0.5 text-body text-text-muted">{sub}</p> : null}
        {entry.quote ? (
          <blockquote className="mt-2 border-l-2 border-border-strong pl-3 text-body italic text-text-muted">
            “{entry.quote}”
          </blockquote>
        ) : null}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <SourceBadge source={entry.source} />
          {entry.rule_ids?.map((r) => <RuleChip key={r} ruleId={r} />)}
        </div>
      </div>
    </li>
  );
}

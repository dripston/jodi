import { Baby, User } from 'lucide-react';
import type { Entry } from '@/api/schemas';
import { RuleChip } from '@/components/status/RuleChip';
import { SourceBadge } from '@/components/status/SourceBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import { isStrongSource } from '@/lib/clinical';
import { cn } from '@/lib/cn';
import { formatAbsolute, formatGrams, formatWhen } from '@/lib/format';
import { factLabel } from '@/lib/labels';

function detail(entry: Entry): string | null {
  if (entry.code === 'weight_grams' && entry.numeric_value !== null) {
    return `${formatGrams(entry.numeric_value)}${entry.value ? ` · ${entry.value}` : ''}`;
  }
  if (!entry.code) return null;
  return entry.value;
}

interface TimelineItemProps {
  entry: Entry;
  isNew?: boolean;
  showSubject?: boolean;
}

export function TimelineItem({ entry, isNew, showSubject = true }: TimelineItemProps) {
  const strong = isStrongSource(entry.source);
  const SubjectIcon = entry.subject === 'baby' ? Baby : User;
  const title = entry.code ? factLabel(entry.code, entry.subject) : (entry.value ?? 'Note');
  const sub = detail(entry);
  return (
    <li className={cn('relative flex gap-4 rounded py-3 pl-2 pr-3', isNew && 'animate-entry-in')}>
      <span
        aria-hidden
        className={cn(
          'relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border',
          strong ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-surface text-text-muted',
        )}
      >
        <SubjectIcon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {showSubject ? (
            <span className="text-small text-text-muted">{entry.subject === 'baby' ? 'Baby' : 'Mother'}</span>
          ) : null}
          <p className={cn('text-body text-text', strong ? 'font-semibold' : 'font-medium')}>{title}</p>
          <Tooltip content={formatAbsolute(entry.created_at)}>
            <button type="button" className="ml-auto cursor-default text-small text-text-subtle">
              <time dateTime={entry.created_at}>{formatWhen(entry.created_at)}</time>
            </button>
          </Tooltip>
        </div>
        {sub ? <p className="tabular mt-0.5 text-small text-text-muted">{sub}</p> : null}
        {entry.quote ? (
          <p className="mt-1 text-small italic text-text-muted">“{entry.quote}”</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <SourceBadge source={entry.source} />
          {entry.rule_ids?.map((r) => <RuleChip key={r} ruleId={r} />)}
        </div>
      </div>
    </li>
  );
}

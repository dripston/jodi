import type { Level } from '@/api/schemas';
import { Tooltip } from '@/components/ui/Tooltip';
import { ruleLevel } from '@/lib/clinical';
import { cn } from '@/lib/cn';
import { ruleLabel } from '@/lib/labels';

interface RuleChipProps {
  ruleId: string;
  level?: Level;
}

const DOT: Record<Level, string> = { red: 'bg-red-fg', amber: 'bg-amber-fg', green: 'bg-text-subtle' };

/** Quiet inline rule label: severity dot + plain-language name. Rule ID in the tooltip for auditors. */
export function RuleChip({ ruleId, level: levelProp }: RuleChipProps) {
  const level = levelProp ?? ruleLevel(ruleId) ?? 'green';
  return (
    <Tooltip content={`Rule ${ruleId}`}>
      <button
        type="button"
        className={cn(
          'inline-flex cursor-default items-center gap-1.5 whitespace-nowrap rounded-sm py-0.5 text-caption',
          level === 'red' ? 'text-red-fg' : level === 'amber' ? 'text-amber-fg' : 'text-text-muted',
        )}
      >
        <span aria-hidden className={cn('size-1.5 rounded-full', DOT[level])} />
        {ruleLabel(ruleId)}
      </button>
    </Tooltip>
  );
}

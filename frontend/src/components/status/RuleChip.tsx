import type { Level } from '@/api/schemas';
import { Tooltip } from '@/components/ui/Tooltip';
import { ruleLevel } from '@/lib/clinical';
import { cn } from '@/lib/cn';
import { ruleLabel } from '@/lib/labels';

interface RuleChipProps {
  ruleId: string;
  level?: Level;
}

/** Shows the plain-language rule name; the rule ID is in the tooltip for auditors. */
export function RuleChip({ ruleId, level: levelProp }: RuleChipProps) {
  const level = levelProp ?? ruleLevel(ruleId);
  return (
    <Tooltip content={`Rule ${ruleId}`}>
      <button
        type="button"
        className={cn(
          'inline-flex cursor-default items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-caption',
          level === 'red' && 'border-red-border text-red-fg',
          level === 'amber' && 'border-amber-border text-amber-fg',
          (!level || level === 'green') && 'border-border text-text-muted',
        )}
      >
        {ruleLabel(ruleId)}
      </button>
    </Tooltip>
  );
}

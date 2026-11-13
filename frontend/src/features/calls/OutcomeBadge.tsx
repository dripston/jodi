import { CircleCheck, PhoneMissed, Siren, TriangleAlert, UserX } from 'lucide-react';
import type { CallOutcome } from '@/api/schemas';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { OUTCOME_LABELS } from '@/lib/labels';

const STYLE: Record<CallOutcome, { icon: typeof Siren; tone: BadgeProps['tone'] }> = {
  completed: { icon: CircleCheck, tone: 'plain' },
  red_flag: { icon: Siren, tone: 'red' },
  amber_flag: { icon: TriangleAlert, tone: 'amber' },
  no_answer: { icon: PhoneMissed, tone: 'neutral' },
  wrong_person: { icon: UserX, tone: 'neutral' },
};

export function OutcomeBadge({ outcome }: { outcome: CallOutcome }) {
  const { icon: Icon, tone } = STYLE[outcome];
  return (
    <Badge tone={tone}>
      <Icon strokeWidth={1.75} aria-hidden />
      {OUTCOME_LABELS[outcome]}
    </Badge>
  );
}

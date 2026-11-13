import { Phone, PhoneMissed } from 'lucide-react';
import type { CallLog } from '@/api/schemas';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { PURPOSE_LABELS } from '@/lib/labels';

export function CallChip({ call }: { call: CallLog }) {
  const Icon = call.answered ? Phone : PhoneMissed;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-small',
        call.answered ? 'text-text-muted' : 'text-amber-fg',
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      <span className="text-text">{PURPOSE_LABELS[call.purpose]}</span>
      <span aria-hidden>·</span>
      <span className="tabular">{call.answered ? formatDuration(call.duration_seconds) : 'Missed'}</span>
    </span>
  );
}

import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatDuration, toDate } from '@/lib/format';

interface EscalationCountdownProps {
  at: string;
  target: string;
}

/** "Escalates to ASHA in 6:42". Ticks every second; shows overdue state at zero. */
export function EscalationCountdown({ at, target }: EscalationCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const remaining = Math.max(0, Math.round((toDate(at).getTime() - now) / 1000));
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-small', remaining === 0 ? 'text-red-fg' : 'text-text-muted')}>
      <Timer className="size-4" strokeWidth={1.75} aria-hidden />
      {remaining === 0 ? (
        <>Escalating to {target} now</>
      ) : (
        <>
          Escalates to {target} in <span className="tabular font-medium text-text">{formatDuration(remaining)}</span>
        </>
      )}
    </span>
  );
}

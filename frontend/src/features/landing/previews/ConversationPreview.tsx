import { PhoneCall } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TRANSCRIPT } from '../sampleData';

/** A check-in call as chat bubbles: Jodi on the left, the mother on the right. */
export function ConversationPreview({ className }: { className?: string }) {
  return (
    <figure className={cn('rounded-lg border border-lp-line bg-white p-4', className)}>
      <figcaption className="sr-only">
        Illustrative check-in call between Jodi and Lakshmi, spoken in Kannada and English.
      </figcaption>
      <div aria-hidden className="select-none">
        <div className="mb-3 flex items-center gap-2 text-small text-text-muted">
          <span className="flex size-6 items-center justify-center rounded-full bg-lp-bg">
            <PhoneCall className="size-3.5 text-lp-ink" strokeWidth={1.75} />
          </span>
          Check-in call · Kannada
          <span className="tabular ml-auto text-text-subtle">02:14</span>
        </div>
        <ul className="space-y-2">
          {TRANSCRIPT.map((line, i) => {
            const jodi = line.who === 'Jodi';
            return (
              <li key={i} className={cn('flex', jodi ? 'justify-start' : 'justify-end')}>
                <span
                  className={cn(
                    'max-w-xs rounded-lg px-3 py-2 text-small',
                    jodi
                      ? 'rounded-bl-sm bg-lp-bg text-lp-ink'
                      : 'rounded-br-sm bg-lp-ink text-lp-bg',
                  )}
                >
                  {line.text}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex items-end justify-center gap-0.5">
          {[3, 5, 8, 4, 7, 10, 6, 9, 4, 6, 3, 5, 8, 4].map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-lp-accent" style={{ height: h * 2 }} />
          ))}
        </div>
      </div>
    </figure>
  );
}

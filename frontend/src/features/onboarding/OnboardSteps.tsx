import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Stage } from './useOnboardingFlow';

const STEPS = [
  { title: 'Photograph the slip', detail: 'Discharge summary from the hospital' },
  { title: 'Check what was read', detail: 'Low-confidence fields are marked' },
  { title: 'Confirm by voice', detail: 'Jodi reads it back; she says yes' },
];

function currentIndex(stage: Stage): number {
  if (stage === 'idle' || stage === 'reading') return 0;
  if (stage === 'review') return 1;
  if (stage === 'calling') return 2;
  return 3;
}

export function OnboardSteps({ stage }: { stage: Stage }) {
  const current = currentIndex(stage);
  return (
    <ol className="grid gap-px overflow-hidden rounded border border-border bg-border shadow-raised sm:grid-cols-3" aria-label="Onboarding steps">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.title} className="flex items-start gap-3 bg-surface px-5 py-4" aria-current={active ? 'step' : undefined}>
            <span
              className={cn(
                'tabular flex size-6 shrink-0 items-center justify-center rounded-full text-caption',
                done && 'bg-text text-white',
                active && 'bg-brand text-white',
                !done && !active && 'border border-border-strong text-text-subtle',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> : i + 1}
            </span>
            <div>
              <p className={cn('text-body font-medium', active || done ? 'text-text' : 'text-text-subtle')}>{step.title}</p>
              <p className="text-small text-text-subtle">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

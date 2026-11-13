import { CalendarPlus, EyeOff, FileText, PhoneCall, RotateCcw, Send } from 'lucide-react';
import { useState } from 'react';
import { useDemoAdvanceDay, useDemoReset, useStartCall } from '@/api/queries';
import type { Asha, Audit, Mother } from '@/api/schemas';
import { ChainBadge } from '@/components/status/ChainBadge';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { toast } from '@/components/ui/toast-store';
import { InjectDialog } from './InjectDialog';

interface DemoControlsProps {
  mother: Mother;
  asha?: Asha;
  audit?: Audit;
  hidden: boolean;
}

export function DemoControls({ mother, asha, audit, hidden }: DemoControlsProps) {
  const reset = useDemoReset();
  const advance = useDemoAdvanceDay();
  const call = useStartCall();
  const [injectOpen, setInjectOpen] = useState(false);
  const fail = (what: string) => () => toast(`Could not ${what}`, { tone: 'error' });
  const startCall = (purpose: 'onboarding' | 'checkin') =>
    call.mutate(
      { motherId: mother.id, purpose },
      { onSuccess: () => toast(`Calling ${mother.name}`, { description: 'Phone A should ring now.' }), onError: fail('start the call') },
    );

  return (
    <footer className="flex items-center gap-4 border-t border-border bg-surface px-6 py-3">
      <ChainBadge audit={audit} />
      {hidden ? (
        <span className="ml-auto text-caption text-text-subtle">
          Press <Kbd>H</Kbd> for demo controls
        </span>
      ) : (
        <div className="ml-auto flex flex-wrap items-center gap-2" role="toolbar" aria-label="Demo controls">
          <Button size="sm" variant="ghost" icon={<RotateCcw strokeWidth={1.75} />} loading={reset.isPending}
            onClick={() => reset.mutate(undefined, { onSuccess: () => toast('Demo data reset'), onError: fail('reset') })}>
            Reset
          </Button>
          <Button size="sm" icon={<CalendarPlus strokeWidth={1.75} />} loading={advance.isPending}
            onClick={() => advance.mutate({ motherId: mother.id, days: 1 }, { onError: fail('advance the day') })}>
            Advance day
          </Button>
          <Button size="sm" icon={<FileText strokeWidth={1.75} />} onClick={() => startCall('onboarding')}>
            Start onboarding call
          </Button>
          <Button size="sm" variant="primary" icon={<PhoneCall strokeWidth={1.75} />} loading={call.isPending} onClick={() => startCall('checkin')}>
            Start check-in call
          </Button>
          <Button size="sm" icon={<Send strokeWidth={1.75} />} onClick={() => setInjectOpen(true)}>
            Inject transcript
          </Button>
          <span className="ml-2 inline-flex items-center gap-1 text-caption text-text-subtle">
            <EyeOff className="size-3.5" strokeWidth={1.75} aria-hidden />
            Hide <Kbd>H</Kbd>
          </span>
        </div>
      )}
      <InjectDialog open={injectOpen} onOpenChange={setInjectOpen} mother={mother} asha={asha} />
    </footer>
  );
}

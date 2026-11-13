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
    <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border bg-surface px-4 py-3 md:px-6">
      <ChainBadge audit={audit} />
      {hidden ? (
        <span className="ml-auto inline-flex items-center gap-1.5 text-caption font-normal text-text-subtle">
          Press <Kbd>H</Kbd> to show demo controls
        </span>
      ) : (
        <div className="ml-auto flex flex-wrap items-center gap-2" role="toolbar" aria-label="Demo controls">
          <span className="mr-1 hidden text-eyebrow text-text-subtle xl:inline">Demo controls</span>
          <Button size="sm" icon={<CalendarPlus strokeWidth={1.75} />} loading={advance.isPending}
            onClick={() => advance.mutate({ motherId: mother.id, days: 1 }, { onError: fail('advance the day') })}>
            Advance day
          </Button>
          <Button size="sm" icon={<FileText strokeWidth={1.75} />} onClick={() => startCall('onboarding')}>
            Onboarding call
          </Button>
          <Button size="sm" variant="primary" icon={<PhoneCall strokeWidth={1.75} />} loading={call.isPending} onClick={() => startCall('checkin')}>
            Start check-in call
          </Button>
          <Button size="sm" icon={<Send strokeWidth={1.75} />} onClick={() => setInjectOpen(true)}>
            Inject transcript
          </Button>
          <span aria-hidden className="mx-1 h-5 w-px bg-border" />
          <Button size="sm" variant="ghost" icon={<RotateCcw strokeWidth={1.75} />} loading={reset.isPending}
            onClick={() => reset.mutate(undefined, { onSuccess: () => toast('Demo data reset'), onError: fail('reset') })}>
            Reset
          </Button>
          <span className="ml-1 hidden items-center gap-1 text-caption font-normal text-text-subtle md:inline-flex">
            <EyeOff className="size-3.5" strokeWidth={1.75} aria-hidden />
            <Kbd>H</Kbd>
          </span>
        </div>
      )}
      <InjectDialog open={injectOpen} onOpenChange={setInjectOpen} mother={mother} asha={asha} />
    </footer>
  );
}

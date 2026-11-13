import { PhoneCall } from 'lucide-react';
import { useStartCall } from '@/api/queries';
import type { Mother } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast-store';

/** Jodi calls her now: the first call (intro + consent + check-in) until she has consented, then a check-in. */
export function CallNow({ mother }: { mother: Mother }) {
  const call = useStartCall();
  const first = mother.consent_at === null;
  const start = () =>
    call.mutate(
      { motherId: mother.id, purpose: first ? 'onboarding' : 'checkin' },
      {
        onSuccess: () =>
          toast(`Calling ${mother.name}`, {
            description: first ? 'Jodi introduces herself, asks her consent, then checks in.' : 'Check-in call.',
          }),
        onError: () => toast('Could not start the call', { tone: 'error' }),
      },
    );
  return (
    <Button variant="primary" icon={<PhoneCall strokeWidth={1.75} />} loading={call.isPending} onClick={start} className="w-full">
      {first ? 'Start first call' : 'Call her now'}
    </Button>
  );
}

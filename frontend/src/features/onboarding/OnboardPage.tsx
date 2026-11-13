import { CircleCheck, FileSearch, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/data/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardFooter, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dropzone } from './Dropzone';
import { OnboardSteps } from './OnboardSteps';
import { ExtractedFieldsForm } from './ExtractedFieldsForm';
import { useOnboardingFlow } from './useOnboardingFlow';

export function OnboardPage() {
  const [phone, setPhone] = useState('+919800000001');
  const flow = useOnboardingFlow(phone);
  return (
    <>
      <PageHeader title="Onboard a mother" description="Read the discharge slip, then Jodi confirms every detail with her on a call." />
      <OnboardSteps stage={flow.stage} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Discharge slip" description="Use synthetic demo slips only" />
          <div className="space-y-4 p-5">
            <div>
              <label htmlFor="phone" className="text-small text-text-muted">Mother's phone number</label>
              <Input id="phone" inputMode="tel" className="tabular mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Dropzone file={flow.file} onFile={flow.choose} disabled={flow.stage === 'calling'} />
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHeader title="What Jodi read" description="Nothing is saved until the mother confirms on the call" />
          <div className="mt-3 flex-1">
            {flow.stage === 'idle' ? (
              <EmptyState icon={FileSearch} title="Nothing read yet" description="Upload a slip and the details appear here for checking." />
            ) : flow.stage === 'reading' || !flow.fields ? (
              <div className="space-y-4 p-5" aria-busy="true" aria-label="Reading the slip">
                <p className="text-small text-text-muted">Reading the slip…</p>
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <ExtractedFieldsForm fields={flow.fields} confirmed={flow.stage === 'confirmed'} />
            )}
          </div>
          <CardFooter className="justify-between">
            {flow.stage === 'confirmed' && flow.mother ? (
              <>
                <span className="inline-flex items-center gap-1.5 text-small text-green-fg">
                  <CircleCheck className="size-4" strokeWidth={1.75} aria-hidden />
                  Saved to {flow.mother.name}'s record
                </span>
                <Button asChild variant="secondary"><Link to={`/mothers/${flow.mother.id}`}>Open profile</Link></Button>
              </>
            ) : (
              <>
                <span className="text-small text-text-muted">
                  {flow.stage === 'calling' ? 'Calling now. Waiting for her to confirm…' : flow.stage === 'review' ? 'Fields marked Check need a closer look.' : 'Upload a slip to continue.'}
                </span>
                <Button
                  variant="primary"
                  icon={<PhoneCall strokeWidth={1.75} />}
                  disabled={flow.stage !== 'review'}
                  loading={flow.calling || flow.stage === 'calling'}
                  onClick={flow.startCall}
                >
                  Start onboarding call
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

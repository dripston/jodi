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
import { RegisterForm } from './RegisterForm';
import { useOnboardingFlow } from './useOnboardingFlow';

export function OnboardPage() {
  const [phone, setPhone] = useState('');
  const flow = useOnboardingFlow(phone);
  const phoneOk = phone.replace(/\D/g, '').length >= 10;
  const afterRecord = flow.stage === 'registered' || flow.stage === 'calling' || flow.stage === 'confirmed';
  return (
    <>
      <PageHeader
        title="Onboard a mother"
        description="Read her discharge slip, add her details, and Jodi calls her: introduction, her consent, then the first check-in."
      />
      <OnboardSteps stage={flow.stage} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Discharge slip" description="Photo of the hospital discharge summary" />
          <div className="space-y-4 p-5">
            <div>
              <label htmlFor="phone" className="text-small text-text-muted">Mother's phone number</label>
              <Input
                id="phone"
                inputMode="tel"
                placeholder="+91 …"
                className="tabular mt-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={afterRecord}
              />
            </div>
            <Dropzone file={flow.file} onFile={flow.choose} disabled={!phoneOk || afterRecord} />
            {!phoneOk ? <p className="text-small text-text-subtle">Enter her phone number first.</p> : null}
          </div>
        </Card>
        <Card className="flex flex-col">
          <CardHeader title="What Jodi read" description="From the slip. Check it before creating her record." />
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
        </Card>
      </div>

      {flow.stage !== 'idle' && flow.stage !== 'reading' ? (
        <Card className="mt-6">
          <CardHeader
            title={afterRecord && flow.mother ? `${flow.mother.name}'s health record` : 'Her details'}
            description={
              afterRecord
                ? 'Created. Her family and ASHA get Jodi alerts on Telegram.'
                : 'Her real name, language, ASHA and the family member to call in an emergency'
            }
          />
          {!afterRecord ? (
            <RegisterForm phone={phone} fields={flow.fields} disabled={false} saving={flow.saving} onSubmit={flow.createRecord} />
          ) : null}
          {afterRecord && flow.mother ? (
            <CardFooter className="justify-between">
              {flow.stage === 'confirmed' ? (
                <span className="inline-flex items-center gap-1.5 text-small text-green-fg">
                  <CircleCheck className="size-4" strokeWidth={1.75} aria-hidden />
                  She gave consent on the call. Jodi is checking in now.
                </span>
              ) : (
                <span className="text-small text-text-muted">
                  {flow.stage === 'calling'
                    ? 'Calling her now. Waiting for her consent…'
                    : 'Jodi introduces herself, asks her consent, then does the first check-in.'}
                </span>
              )}
              <div className="flex gap-2">
                <Button asChild variant="secondary">
                  <Link to={`/mothers/${flow.mother.id}`}>Open her page</Link>
                </Button>
                {flow.stage === 'registered' ? (
                  <Button variant="primary" icon={<PhoneCall strokeWidth={1.75} />} loading={flow.calling} onClick={flow.startCall}>
                    Start first call
                  </Button>
                ) : null}
              </div>
            </CardFooter>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

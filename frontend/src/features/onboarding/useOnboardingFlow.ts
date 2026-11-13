import { useState } from 'react';
import { usePhotoJob, useRegister, useStartCall, useTimeline, useUploadPhoto } from '@/api/queries';
import type { Mother, RegisterInput } from '@/api/schemas';
import { toast } from '@/components/ui/toast-store';

export type Stage = 'idle' | 'reading' | 'review' | 'registered' | 'calling' | 'confirmed';

/** Upload → read the slip → ASHA adds her real details → health record → Jodi's first call (consent + check-in). */
export function useOnboardingFlow(phone: string) {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [mother, setMother] = useState<Mother | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<string | null>(null);
  const upload = useUploadPhoto();
  const job = usePhotoJob(jobId);
  const register = useRegister();
  const call = useStartCall();
  const timeline = useTimeline(mother?.id ?? '', callStartedAt !== null);
  // Her own spoken consent on the first call is recorded as a note on her timeline.
  const confirmed =
    callStartedAt !== null &&
    (timeline.data ?? []).some((e) => e.kind === 'note' && (e.value ?? '').includes('Spoken consent') && e.created_at > callStartedAt);

  const stage: Stage = confirmed
    ? 'confirmed'
    : callStartedAt
      ? 'calling'
      : mother
        ? 'registered'
        : job.data?.status === 'done'
          ? 'review'
          : jobId || upload.isPending
            ? 'reading'
            : 'idle';

  const choose = (f: File) => {
    setFile(f);
    setJobId(null);
    setMother(null);
    setCallStartedAt(null);
    upload.mutate(
      { file: f, phone },
      { onSuccess: (r) => setJobId(r.job_id), onError: () => toast('Could not upload the photo', { tone: 'error' }) },
    );
  };

  const createRecord = (input: RegisterInput) =>
    register.mutate(input, {
      onSuccess: (r) => {
        setMother(r.mother);
        setCallStartedAt(new Date().toISOString()); // the backend places Jodi's first call straight away
        toast(`Health record created. Jodi is calling ${r.mother.name} now`, {
          description: 'Introduction, her consent, then the first check-in.',
        });
      },
      onError: () => toast('Could not create the record', { tone: 'error', description: 'Check the details and try again.' }),
    });

  const startCall = () => {
    if (!mother) return;
    const at = new Date().toISOString();
    call.mutate(
      { motherId: mother.id, purpose: 'onboarding' },
      {
        onSuccess: () => {
          setCallStartedAt(at);
          toast(`Calling ${mother.name}`, { description: 'Jodi introduces herself, asks consent, then checks in.' });
        },
        onError: () => toast('Could not start the call', { tone: 'error' }),
      },
    );
  };

  return {
    file,
    choose,
    stage,
    fields: job.data?.fields ?? null,
    createRecord,
    saving: register.isPending,
    startCall,
    calling: call.isPending,
    mother,
  };
}

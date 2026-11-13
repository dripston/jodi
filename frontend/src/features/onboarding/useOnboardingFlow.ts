import { useMemo, useState } from 'react';
import { useMothers, usePhotoJob, useStartCall, useTimeline, useUploadPhoto } from '@/api/queries';
import { toast } from '@/components/ui/toast-store';

export type Stage = 'idle' | 'reading' | 'review' | 'calling' | 'confirmed';

/** Upload → poll Document AI → start onboarding call → wait for confirmed entries on the timeline. */
export function useOnboardingFlow(phone: string) {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<string | null>(null);
  const upload = useUploadPhoto();
  const job = usePhotoJob(jobId);
  const call = useStartCall();
  const mothers = useMothers();
  const mother = useMemo(
    () => mothers.data?.find((m) => m.phone.replace(/\D/g, '').endsWith(phone.replace(/\D/g, '').slice(-10))),
    [mothers.data, phone],
  );
  const timeline = useTimeline(mother?.id ?? '', callStartedAt !== null);
  const confirmed =
    callStartedAt !== null &&
    (timeline.data ?? []).some((e) => e.source === 'document_extracted' && e.created_at > callStartedAt);

  const stage: Stage = confirmed
    ? 'confirmed'
    : callStartedAt
      ? 'calling'
      : job.data?.status === 'done'
        ? 'review'
        : jobId || upload.isPending
          ? 'reading'
          : 'idle';

  const choose = (f: File) => {
    setFile(f);
    setJobId(null);
    setCallStartedAt(null);
    upload.mutate(
      { file: f, phone },
      { onSuccess: (r) => setJobId(r.job_id), onError: () => toast('Could not upload the photo', { tone: 'error' }) },
    );
  };

  const startCall = () => {
    if (!mother) {
      toast('No enrolled mother has this phone number', { tone: 'error', description: 'Check the number and try again.' });
      return;
    }
    const at = new Date().toISOString();
    call.mutate(
      { motherId: mother.id, purpose: 'onboarding' },
      {
        onSuccess: () => {
          setCallStartedAt(at);
          toast(`Calling ${mother.name}`, { description: 'Jodi will read the details back in her language.' });
        },
        onError: () => toast('Could not start the call', { tone: 'error' }),
      },
    );
  };

  return { file, choose, stage, fields: job.data?.fields ?? null, startCall, calling: call.isPending, mother };
}

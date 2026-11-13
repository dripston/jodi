import { Send } from 'lucide-react';
import { useState } from 'react';
import { useDemoInject } from '@/api/queries';
import type { Asha, Mother } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Input';
import { toast } from '@/components/ui/toast-store';
import { cn } from '@/lib/cn';
import { LEVEL_LABELS } from '@/lib/labels';
import { PRESETS } from './presets';

interface InjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mother: Mother;
  asha?: Asha;
}

export function InjectDialog({ open, onOpenChange, mother, asha }: InjectDialogProps) {
  const [presetId, setPresetId] = useState(PRESETS[0]?.id ?? '');
  const preset = PRESETS.find((p) => p.id === presetId);
  const [text, setText] = useState(preset?.transcript ?? '');
  const inject = useDemoInject();

  const phoneFor = (caller: string) =>
    caller === 'asha' ? (asha?.phone ?? '') : caller === 'family' ? (mother.family_phones[0]?.phone ?? '') : mother.phone;

  const submit = () =>
    inject.mutate(
      { motherId: mother.id, callerPhone: phoneFor(preset?.caller ?? 'mother'), transcript: text },
      {
        onSuccess: (r) => {
          toast('Transcript processed', { tone: 'success', description: r.level ? `Result: ${LEVEL_LABELS[r.level]}` : undefined });
          onOpenChange(false);
        },
        onError: () => toast('Could not process the transcript', { tone: 'error' }),
      },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Inject transcript"
      description="Fallback if a live call fails. Runs the same pipeline as a finished call."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" loading={inject.isPending} icon={<Send strokeWidth={1.75} />} onClick={submit} disabled={!text.trim()}>
            Run transcript
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Preset">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.id === presetId}
            onClick={() => {
              setPresetId(p.id);
              setText(p.transcript);
            }}
            className={cn(
              'h-8 rounded-sm border px-3 text-small transition-colors duration-120',
              p.id === presetId ? 'border-brand bg-brand-soft text-brand' : 'border-border text-text-muted hover:text-text',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label htmlFor="inject-text" className="mt-4 block text-small text-text-muted">
        Transcript (caller: {preset?.caller ?? 'mother'})
      </label>
      <Textarea id="inject-text" lang="kn" className="mt-1 min-h-28" value={text} onChange={(e) => setText(e.target.value)} />
    </Dialog>
  );
}

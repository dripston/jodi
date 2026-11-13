import { Copy, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useShareRecord } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast-store';
import { formatWhen } from '@/lib/format';

/** Send the family a private link + one-time code to show her record to the treating doctor. */
export function ShareRecord({ motherId }: { motherId: string }) {
  const share = useShareRecord();
  const [result, setResult] = useState<{ url: string; expires_at: string } | null>(null);

  const send = () =>
    share.mutate(
      { motherId, by: 'asha:dashboard' },
      {
        onSuccess: (r) => {
          setResult(r);
          toast('Link and one-time code sent', { description: 'On Telegram to her family and ASHA.' });
        },
        onError: () => toast('Could not create the share link', { tone: 'error' }),
      },
    );

  return (
    <div className="space-y-2">
      <p className="text-small text-text-muted">Share with the doctor</p>
      <p className="text-small text-text-subtle">
        The family gets a private link and a one-time code on Telegram. The doctor opens the link and types the code.
      </p>
      <Button variant="secondary" icon={<Share2 strokeWidth={1.75} />} loading={share.isPending} onClick={send}>
        {result ? 'Send a new link' : 'Share record'}
      </Button>
      {result ? (
        <div className="space-y-1 rounded-sm bg-surface-muted p-2">
          <p className="break-all text-caption text-text-muted">{result.url}</p>
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-subtle">Expires {formatWhen(result.expires_at)}</span>
            <Button
              variant="ghost"
              size="sm"
              icon={<Copy strokeWidth={1.75} />}
              onClick={() => void navigator.clipboard?.writeText(result.url).then(() => toast('Link copied'))}
            >
              Copy
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

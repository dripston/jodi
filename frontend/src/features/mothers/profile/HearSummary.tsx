import { Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useSummary } from '@/api/queries';
import { ErrorState } from '@/components/data/ErrorState';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';

export function HearSummary({ motherId }: { motherId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useSummary(motherId, open);
  return (
    <>
      <Button className="w-full" icon={<Volume2 strokeWidth={1.75} />} onClick={() => setOpen(true)}>
        Hear summary
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="What Jodi reads to a doctor"
        description="Read aloud when the mother hands her phone to a doctor. Exact text."
        footer={<Button onClick={() => setOpen(false)}>Close</Button>}
      >
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <blockquote className="rounded border border-border bg-surface-muted p-4 text-body leading-relaxed text-text">
            {data?.summary_text}
          </blockquote>
        )}
      </Dialog>
    </>
  );
}

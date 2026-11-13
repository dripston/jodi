import type { z } from 'zod';
import type { TurnSchema } from '@/api/schemas';
import { cn } from '@/lib/cn';

type Turn = z.infer<typeof TurnSchema>;

/** The call as a conversation: Jodi on the left, the caller on the right; original words, English below. */
export function ChatTranscript({ turns, highlights }: { turns: Turn[]; highlights: string[] }) {
  const quotes = highlights.map((q) => q.trim().toLowerCase()).filter((q) => q.length > 2);
  const isFact = (t: Turn) => quotes.some((q) => t.text.toLowerCase().includes(q) || t.en.toLowerCase().includes(q));
  return (
    <ol className="space-y-3 rounded border border-border bg-surface-muted p-4">
      {turns.map((t, i) => {
        const jodi = t.role === 'agent';
        return (
          <li key={i} className={cn('flex flex-col', jodi ? 'items-start' : 'items-end')}>
            <span className="mb-0.5 text-caption text-text-subtle">{t.speaker}</span>
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-body leading-relaxed shadow-raised',
                jodi ? 'rounded-tl-sm bg-surface text-text' : 'rounded-tr-sm bg-brand text-white',
                !jodi && isFact(t) && 'ring-2 ring-amber-fg ring-offset-1',
              )}
            >
              <p>{t.text}</p>
              {t.en ? <p className={cn('mt-1 text-small', jodi ? 'text-text-muted' : 'text-white/80')}>{t.en}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

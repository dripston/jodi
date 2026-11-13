import { Fragment } from 'react';

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Renders the transcript with extracted-fact quotes highlighted inline. */
export function Transcript({ text, highlights }: { text: string; highlights: string[] }) {
  const quotes = highlights.filter((q) => q.trim().length > 2);
  const re = quotes.length ? new RegExp(`(${quotes.map(escape).join('|')})`, 'gi') : null;
  return (
    <div className="space-y-2 rounded border border-border bg-surface-muted p-4">
      {text.split('\n').map((line, i) => {
        const [speaker, ...rest] = line.split(':');
        const hasSpeaker = rest.length > 0 && (speaker?.length ?? 0) < 24;
        const body = hasSpeaker ? rest.join(':').trim() : line;
        const parts = re ? body.split(re) : [body];
        return (
          <p key={i} className="text-body leading-relaxed text-text">
            {hasSpeaker ? <span className="mr-2 text-small font-medium text-text-muted">{speaker}</span> : null}
            {parts.map((part, j) =>
              re && quotes.some((q) => q.toLowerCase() === part.toLowerCase()) ? (
                <mark key={j} className="rounded-sm bg-brand-soft px-0.5 text-brand">
                  {part}
                </mark>
              ) : (
                <Fragment key={j}>{part}</Fragment>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

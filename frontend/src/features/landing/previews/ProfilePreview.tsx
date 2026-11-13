import { Baby, User } from 'lucide-react';
import { SourceBadge } from '@/components/status/SourceBadge';
import { StatusPill } from '@/components/status/StatusPill';
import { cn } from '@/lib/cn';
import { TIMELINE } from '../sampleData';

/** Mother-and-baby record: the pair side by side, then source-labelled entries. */
export function ProfilePreview({
  className,
  entries = 3,
}: {
  className?: string;
  entries?: number;
}) {
  return (
    <figure className={cn('overflow-hidden rounded-lg border border-lp-line bg-white', className)}>
      <figcaption className="sr-only">
        Illustrative record for Lakshmi and her baby, day 5, with entries labelled by source.
      </figcaption>
      <div aria-hidden className="select-none">
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <div className="p-3.5">
            <p className="flex items-center gap-1.5 text-small text-text-muted">
              <User className="size-3.5" strokeWidth={1.75} /> Mother
            </p>
            <p className="mt-1 text-h3 text-text">Lakshmi</p>
            <p className="text-small text-text-subtle">Day 5 · C-section</p>
            <StatusPill level="red" size="sm" className="mt-2" />
          </div>
          <div className="p-3.5">
            <p className="flex items-center gap-1.5 text-small text-text-muted">
              <Baby className="size-3.5" strokeWidth={1.75} /> Baby
            </p>
            <p className="mt-1 text-h3 text-text">Baby of Lakshmi</p>
            <p className="tabular text-small text-text-subtle">2.6 kg at birth</p>
            <StatusPill level="amber" size="sm" className="mt-2" />
          </div>
        </div>
        <ul className="divide-y divide-border">
          {TIMELINE.slice(0, entries).map((e, i) => (
            <li key={i} className="flex items-start gap-3 px-3.5 py-2.5">
              <span className="tabular w-14 shrink-0 pt-0.5 text-caption font-normal text-text-subtle">
                {e.time}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-small font-medium text-text">{e.text}</p>
                {e.quote ? (
                  <p className="truncate text-caption font-normal italic text-text-muted">
                    “{e.quote}”
                  </p>
                ) : null}
                <div className="mt-1">
                  <SourceBadge source={e.source} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

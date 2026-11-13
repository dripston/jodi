import { MapPinCheck, Phone } from 'lucide-react';
import { StatusPill } from '@/components/status/StatusPill';
import { FAMILIES } from '../sampleData';
import { PhoneFrame } from './PreviewFrame';

/** ASHA Sunita's phone list: priority number, reason, status, Call and Mark reached. */
export function AshaPreview({ className, count = 3 }: { className?: string; count?: number }) {
  const list = FAMILIES.filter((f) => f.asha === 'Sunita').slice(0, count);
  return (
    <PhoneFrame
      className={className}
      label="Illustrative ASHA workspace on a phone: Sunita's families for today, most urgent first, each with Call and Mark reached."
    >
      <div className="border-b border-border bg-surface px-4 py-3">
        <p className="text-caption text-text-subtle">ASHA workspace</p>
        <p className="text-h2 text-text">Sunita</p>
        <p className="text-small text-text-muted">2 of 3 families need you today.</p>
      </div>
      <ul className="space-y-2.5 p-3">
        {list.map((f, i) => (
          <li key={f.mother} className="rounded border border-border bg-surface p-3">
            <div className="flex items-start gap-2.5">
              <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-caption text-text-muted">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-text">
                  {f.mother} <span className="font-normal text-text-subtle">· Day {f.day}</span>
                </p>
                <p className="line-clamp-2 text-small text-text-muted">{f.reason}</p>
                <StatusPill level={f.motherLevel} size="sm" className="mt-1.5" />
              </div>
            </div>
            {f.motherLevel !== 'green' ? (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <span className="flex h-9 items-center justify-center gap-1.5 rounded bg-brand text-small font-medium text-white">
                  <Phone className="size-3.5" strokeWidth={1.75} /> Call
                </span>
                <span className="flex h-9 items-center justify-center gap-1.5 rounded border border-border-strong text-small font-medium text-text">
                  <MapPinCheck className="size-3.5" strokeWidth={1.75} /> Mark reached
                </span>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </PhoneFrame>
  );
}

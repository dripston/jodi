import { Mic, Phone, Stethoscope, UserRound, Users } from 'lucide-react';
import { SourceBadge } from '@/components/status/SourceBadge';

const CARD = 'w-full max-w-xs rounded border border-lp-line bg-white p-3.5 shadow-raised';

/** Phone call in progress, with a quiet waveform. */
export function VoiceIllustration() {
  return (
    <div aria-hidden className={CARD}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-lp-ink">
          <Phone className="size-4 text-lp-bg" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-body font-medium text-lp-ink">Jodi is calling</p>
          <p className="text-small text-lp-muted">Kannada · any phone</p>
        </div>
        <Mic className="ml-auto size-4 text-lp-accent" strokeWidth={1.75} />
      </div>
      <div className="mt-4 flex h-8 items-center gap-1">
        {[2, 4, 7, 3, 6, 8, 5, 3, 6, 4, 7, 2, 5, 3, 4, 6, 2].map((h, i) => (
          <span key={i} className="w-1 flex-1 rounded-full bg-lp-line" style={{ height: h * 3 }} />
        ))}
      </div>
    </div>
  );
}

/** Spoken words becoming a labelled, plain-language entry. */
export function CaptureIllustration() {
  return (
    <div aria-hidden className={CARD}>
      <p className="text-small italic text-lp-muted">“four cloths since morning”</p>
      <div className="my-2.5 h-px bg-lp-line" />
      <p className="text-body font-medium text-lp-ink">Pads soaked: 4 since morning</p>
      <div className="mt-1.5">
        <SourceBadge source="mother_reported" />
      </div>
    </div>
  );
}

/** One family connected to the people responsible for her. */
export function ConnectIllustration() {
  const people = [
    { icon: UserRound, label: 'Mother' },
    { icon: Users, label: 'Family' },
    { icon: Stethoscope, label: 'ASHA' },
  ];
  return (
    <div aria-hidden className={`${CARD} flex items-center justify-between`}>
      {people.map(({ icon: Icon, label }, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1.5">
            <span className="flex size-10 items-center justify-center rounded-full border border-lp-line bg-lp-bg">
              <Icon className="size-4 text-lp-ink" strokeWidth={1.75} />
            </span>
            <span className="text-caption text-lp-muted">{label}</span>
          </div>
          {i < people.length - 1 ? <span className="mb-5 h-px w-6 bg-lp-accent sm:w-8" /> : null}
        </div>
      ))}
    </div>
  );
}

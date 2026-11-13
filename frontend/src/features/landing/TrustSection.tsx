import { HeartHandshake, Lock, ShieldCheck, Stethoscope, Tags } from 'lucide-react';
import { SourceBadge } from '@/components/status/SourceBadge';
import { TRUST } from './content';
import { LandingSection } from './LandingSection';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';

const ICONS = [HeartHandshake, ShieldCheck, Stethoscope, Tags, Lock];

/** Understated principles list, with the real source badges as proof of the reported/measured split. */
export function TrustSection() {
  return (
    <LandingSection labelledBy="trust-title">
      <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
        <div className="lg:col-span-2">
          <SectionIntro
            id="trust-title"
            align="left"
            badge={TRUST.badge}
            title={TRUST.title}
            lead={TRUST.lead}
          />
          <Reveal delay={120} className="mt-8 rounded-lg border border-lp-line bg-white p-5">
            <p className="text-small text-lp-muted">Every entry shows where it came from</p>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
              <SourceBadge source="mother_reported" />
              <SourceBadge source="asha_measured" />
              <SourceBadge source="doctor_verified" />
            </div>
          </Reveal>
        </div>
        <ul className="divide-y divide-lp-line border-y border-lp-line lg:col-span-3">
          {TRUST.points.map((point, i) => {
            const Icon = ICONS[i] ?? ShieldCheck;
            return (
              <li key={point.title}>
                <Reveal delay={i * 60} className="flex gap-4 py-5">
                  <Icon
                    className="mt-0.5 size-5 shrink-0 text-lp-ink"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <div>
                    <h3 className="text-h3 text-lp-ink">{point.title}</h3>
                    <p className="mt-1 text-body-lg text-lp-muted">{point.body}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </LandingSection>
  );
}

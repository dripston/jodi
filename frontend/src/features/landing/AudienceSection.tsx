import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { AUDIENCE } from './content';
import { LandingSection } from './LandingSection';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';
import { AshaPreview } from './previews/AshaPreview';
import { DistrictPreview } from './previews/DistrictPreview';

const VISUALS: ReactNode[] = [<AshaPreview key="asha" />, <DistrictPreview key="district" />];

/** Two large panels: what the ASHA sees, and what the district team sees. */
export function AudienceSection() {
  return (
    <LandingSection id="teams" labelledBy="teams-title">
      <SectionIntro id="teams-title" badge={AUDIENCE.badge} title={AUDIENCE.title} />
      <div className="mt-14 grid gap-5 lg:grid-cols-2 lg:gap-6">
        {AUDIENCE.panels.map((panel, i) => (
          <Reveal key={panel.title} delay={i * 120} className="h-full">
            <article className="flex h-full flex-col overflow-hidden rounded-lg border border-lp-line bg-white">
              <div className="p-6 sm:p-8">
                <h3 className="font-serif text-lp-h2 text-lp-ink">{panel.title}</h3>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {panel.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-body-lg text-lp-muted">
                      <Check
                        className="mt-1 size-4 shrink-0 text-lp-ink"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hatch flex flex-1 items-end justify-center border-t border-lp-line px-6 pt-8 sm:px-8">
                <div
                  className={i === 0 ? '-mb-px w-full [&>figure]:rounded-b-none' : 'w-full pb-8'}
                >
                  {VISUALS[i]}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}

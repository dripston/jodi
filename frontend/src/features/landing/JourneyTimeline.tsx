import { Check } from 'lucide-react';
import { JOURNEY } from './content';
import { LandingSection } from './LandingSection';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';

/** Three stages of the 42 days: a horizontal rail on desktop, a vertical one on phones. */
export function JourneyTimeline() {
  return (
    <LandingSection id="why" labelledBy="journey-title">
      <SectionIntro
        id="journey-title"
        badge={JOURNEY.badge}
        title={JOURNEY.title}
        lead={JOURNEY.lead}
      />
      <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-10 lg:gap-16">
        <span
          aria-hidden
          className="absolute bottom-2 left-3 top-2 w-px bg-lp-line md:inset-x-0 md:bottom-auto md:left-0 md:top-3 md:h-px md:w-full"
        />
        {JOURNEY.stages.map((stage, i) => (
          <li key={stage.days} className="relative pl-12 md:pl-0 md:pt-12">
            <span
              aria-hidden
              className="absolute left-0 top-0 flex size-6 items-center justify-center rounded-full border border-lp-line bg-white"
            >
              <span className="size-2 rounded-full bg-lp-accent" />
            </span>
            <Reveal delay={i * 120}>
              <p className="tabular text-caption uppercase tracking-wider text-lp-muted">
                {stage.days}
              </p>
              <h3 className="mt-2 font-serif text-lp-h3 text-lp-ink">{stage.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {stage.points.map((p) => (
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
            </Reveal>
          </li>
        ))}
      </ol>
      <p className="mt-14 border-t border-lp-line pt-5 text-small text-lp-muted">{JOURNEY.note}</p>
    </LandingSection>
  );
}

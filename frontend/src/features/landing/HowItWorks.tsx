import { HOW } from './content';
import { FeatureCard } from './FeatureCard';
import { LandingSection } from './LandingSection';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';
import {
  CaptureIllustration,
  ConnectIllustration,
  VoiceIllustration,
} from './previews/HowIllustrations';

const VISUALS = [
  <VoiceIllustration key="v" />,
  <CaptureIllustration key="c" />,
  <ConnectIllustration key="n" />,
];

export function HowItWorks() {
  return (
    <LandingSection id="how" labelledBy="how-title">
      <SectionIntro id="how-title" badge={HOW.badge} title={HOW.title} lead={HOW.lead} />
      <div className="mt-14 grid gap-5 md:grid-cols-3 lg:gap-6">
        {HOW.steps.map((step, i) => (
          <Reveal key={step.title} delay={i * 100} className="h-full">
            <FeatureCard
              index={i}
              title={step.title}
              body={step.body}
              visual={VISUALS[i]}
              visualClassName="min-h-44"
            />
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}

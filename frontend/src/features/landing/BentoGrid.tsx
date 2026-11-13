import { BENTO } from './content';
import { FeatureCard } from './FeatureCard';
import { LandingSection } from './LandingSection';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';
import { AnalyticsPreview } from './previews/AnalyticsPreview';
import { AshaPreview } from './previews/AshaPreview';
import { ConversationPreview } from './previews/ConversationPreview';
import { ProfilePreview } from './previews/ProfilePreview';

const VISUALS = [
  <ConversationPreview key="voice" className="w-full max-w-md" />,
  <ProfilePreview key="profile" className="w-full max-w-md" />,
  <AshaPreview key="asha" count={2} />,
  <AnalyticsPreview key="district" className="w-full max-w-md" />,
];

/** 2×2 grid of the four product capabilities, each with a preview drawn from the real UI. */
export function BentoGrid() {
  return (
    <LandingSection id="features" labelledBy="features-title">
      <SectionIntro id="features-title" badge={BENTO.badge} title={BENTO.title} />
      <div className="mt-14 grid gap-5 md:grid-cols-2 lg:gap-6">
        {BENTO.cards.map((card, i) => (
          <Reveal key={card.title} delay={(i % 2) * 100} className="h-full">
            <FeatureCard
              title={card.title}
              body={card.body}
              visual={VISUALS[i]}
              visualClassName="min-h-80"
            />
          </Reveal>
        ))}
      </div>
    </LandingSection>
  );
}

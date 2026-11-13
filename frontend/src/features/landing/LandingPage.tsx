import { useEffect } from 'react';
import { AudienceSection } from './AudienceSection';
import { BentoGrid } from './BentoGrid';
import { FAQAccordion } from './FAQAccordion';
import { FinalCTA } from './FinalCTA';
import { HeroSection } from './HeroSection';
import { HowItWorks } from './HowItWorks';
import { JourneyTimeline } from './JourneyTimeline';
import { LandingFooter } from './LandingFooter';
import { LandingNavbar } from './LandingNavbar';
import { ProductPreviewTabs } from './ProductPreviewTabs';
import { TrustSection } from './TrustSection';

/** Public entry point at "/". The working application lives at /app and its own routes. */
export function LandingPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Jodi · A 42-day care companion for mothers and newborns';
    const root = document.documentElement;
    root.classList.add('motion-safe:scroll-smooth');
    return () => {
      document.title = previous;
      root.classList.remove('motion-safe:scroll-smooth');
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-lp-bg text-lp-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-lp-ink"
      >
        Skip to content
      </a>
      <LandingNavbar />
      <main id="main">
        <HeroSection />
        <JourneyTimeline />
        <HowItWorks />
        <BentoGrid />
        <AudienceSection />
        <TrustSection />
        <ProductPreviewTabs />
        <FAQAccordion />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}

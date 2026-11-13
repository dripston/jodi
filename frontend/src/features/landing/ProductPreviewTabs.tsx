import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { APP_PATH, TABS, type PreviewTabId } from './content';
import { LandingSection } from './LandingSection';
import { PillLink } from './PillLink';
import { Reveal } from './Reveal';
import { SectionIntro } from './SectionIntro';
import { AlertsPreview } from './previews/AlertsPreview';
import { AshaPreview } from './previews/AshaPreview';
import { DashboardPreview } from './previews/DashboardPreview';
import { LivePreview } from './previews/LivePreview';
import { MothersPreview } from './previews/MothersPreview';

const isTab = (v: string): v is PreviewTabId => TABS.items.some((t) => t.id === v);

const PREVIEWS: Record<PreviewTabId, ReactNode> = {
  overview: <DashboardPreview />,
  mothers: <MothersPreview />,
  alerts: <AlertsPreview />,
  asha: <AshaPreview count={3} />,
  live: <LivePreview />,
};

/**
 * Tabbed tour of the product. It advances when the active tab's progress bar finishes, so
 * hovering or focusing pauses it, any manual choice stops it, and reduced motion never starts it.
 */
export function ProductPreviewTabs() {
  const [active, setActive] = useState<PreviewTabId>('overview');
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);

  const next = () => {
    const i = TABS.items.findIndex((t) => t.id === active);
    const following = TABS.items[(i + 1) % TABS.items.length];
    if (following) setActive(following.id);
  };

  return (
    <LandingSection labelledBy="tour-title">
      <SectionIntro id="tour-title" badge={TABS.badge} title={TABS.title} />
      <Reveal className="mt-12">
        <TabsPrimitive.Root
          value={active}
          onValueChange={(v) => {
            if (!isTab(v)) return;
            setAuto(false);
            setActive(v);
          }}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <TabsPrimitive.List
            aria-label="Product screens"
            className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
          >
            {TABS.items.map((t) => (
              <TabsPrimitive.Trigger
                key={t.id}
                value={t.id}
                className="relative inline-flex h-10 shrink-0 cursor-pointer items-center overflow-hidden whitespace-nowrap rounded-full border border-lp-line bg-white px-4 text-body text-lp-muted transition-colors duration-180 hover:text-lp-ink data-[state=active]:border-lp-ink data-[state=active]:bg-lp-ink data-[state=active]:text-lp-bg"
              >
                {t.label}
                {auto && t.id === active ? (
                  <span
                    key={active}
                    aria-hidden
                    onAnimationEnd={next}
                    style={{ animationPlayState: paused ? 'paused' : 'running' }}
                    className="absolute inset-x-3 bottom-1 h-0.5 origin-left animate-tab-progress rounded-full bg-lp-accent motion-reduce:hidden"
                  />
                ) : null}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>
          {TABS.items.map((t) => (
            <TabsPrimitive.Content
              key={t.id}
              value={t.id}
              className="mt-8 animate-fade-in focus-visible:outline-none"
            >
              <p className="mb-5 text-center text-body-lg text-lp-muted">{t.caption}</p>
              <div
                className={cn(
                  'hatch rounded-lg border border-lp-line p-3 sm:p-8',
                  t.id === 'asha' && 'py-8',
                )}
              >
                {PREVIEWS[t.id]}
              </div>
            </TabsPrimitive.Content>
          ))}
        </TabsPrimitive.Root>
      </Reveal>
      <div className="mt-10 flex justify-center">
        <PillLink to={APP_PATH} size="lg" arrow className="w-full sm:w-auto">
          {TABS.cta}
        </PillLink>
      </div>
    </LandingSection>
  );
}

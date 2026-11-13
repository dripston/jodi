import { APP_PATH, HERO } from './content';
import { PillLink } from './PillLink';
import { DashboardPreview } from './previews/DashboardPreview';
import { FRAME, FRAME_OUTER } from './frame';
import { cn } from '@/lib/cn';

export function HeroSection() {
  return (
    <section id="top" aria-labelledby="hero-title" className={cn('relative', FRAME_OUTER)}>
      <div className={cn(FRAME, 'pb-16 pt-36 md:pt-44')}>
        <div className="mx-auto max-w-4xl text-center">
          <p className="animate-fade-up text-caption uppercase tracking-widest text-lp-muted">
            {HERO.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="mt-6 animate-fade-up-1 text-balance font-serif text-lp-hero text-lp-ink"
          >
            {HERO.title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-up-2 text-pretty text-lp-lead text-lp-muted">
            {HERO.description}
          </p>
          <div className="mt-9 flex animate-fade-up-3 flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <PillLink to={APP_PATH} size="lg" arrow>
              {HERO.primary}
            </PillLink>
            <PillLink to="#how" size="lg" variant="secondary">
              {HERO.secondary}
            </PillLink>
          </div>
        </div>
        <dl className="mx-auto mt-14 grid max-w-3xl animate-fade-up-4 grid-cols-3 divide-x divide-lp-line border-y border-lp-line">
          {HERO.facts.map((f) => (
            <div key={f.label} className="px-3 py-4 text-center sm:px-6">
              <dt className="sr-only">{f.label}</dt>
              <dd>
                <span className="tabular block font-serif text-lp-h2 text-lp-ink">{f.value}</span>
                <span className="mt-1 block text-small text-lp-muted">{f.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="border-t border-lp-line">
        <div className={cn(FRAME, 'hatch px-3 py-8 sm:py-12')}>
          <div className="animate-fade-up-4">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

import { APP_PATH, FINAL_CTA } from './content';
import { PillLink } from './PillLink';
import { Reveal } from './Reveal';
import { FRAME, FRAME_OUTER } from './frame';
import { cn } from '@/lib/cn';

export function FinalCTA() {
  return (
    <section aria-labelledby="final-title" className={cn('border-t border-lp-line', FRAME_OUTER)}>
      <div className={cn(FRAME, 'hatch py-24 md:py-32')}>
        <Reveal className="mx-auto max-w-3xl rounded-lg border border-lp-line bg-lp-bg px-6 py-12 text-center sm:px-12">
          <h2 id="final-title" className="text-balance font-serif text-lp-h2 text-lp-ink">
            {FINAL_CTA.title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lp-lead text-lp-muted">
            {FINAL_CTA.body}
          </p>
          <PillLink to={APP_PATH} size="lg" arrow className="mt-9 w-full sm:w-auto">
            {FINAL_CTA.button}
          </PillLink>
        </Reveal>
      </div>
    </section>
  );
}

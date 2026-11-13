import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { FAQ } from './content';
import { LandingSection } from './LandingSection';
import { SectionIntro } from './SectionIntro';

/** Two-column FAQ. A single-open accordion: opening one item closes the other. */
export function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <LandingSection labelledBy="faq-title">
      <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
        <SectionIntro
          id="faq-title"
          align="left"
          badge={FAQ.badge}
          title={FAQ.title}
          lead={FAQ.lead}
          className="lg:col-span-2"
        />
        <ul className="divide-y divide-lp-line border-y border-lp-line lg:col-span-3">
          {FAQ.items.map((item, i) => {
            const isOpen = open === i;
            const btn = `${base}-q${i}`;
            const panel = `${base}-a${i}`;
            return (
              <li key={item.q}>
                <h3>
                  <button
                    id={btn}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panel}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full cursor-pointer items-center gap-4 py-5 text-left text-body-lg font-medium text-lp-ink"
                  >
                    <span className="flex-1">{item.q}</span>
                    <Plus
                      aria-hidden
                      strokeWidth={1.75}
                      className={cn(
                        'size-5 shrink-0 text-lp-muted transition-transform duration-180 ease-standard motion-reduce:transition-none',
                        isOpen && 'rotate-45',
                      )}
                    />
                  </button>
                </h3>
                <div
                  id={panel}
                  role="region"
                  aria-labelledby={btn}
                  hidden={!isOpen}
                  className="pb-5 pr-9"
                >
                  <p className="animate-fade-in text-body-lg text-lp-muted">{item.a}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </LandingSection>
  );
}

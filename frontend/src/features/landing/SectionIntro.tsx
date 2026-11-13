import { cn } from '@/lib/cn';
import { Reveal } from './Reveal';
import { SectionBadge } from './SectionBadge';

interface SectionIntroProps {
  badge: string;
  title: string;
  lead?: string;
  id?: string;
  align?: 'center' | 'left';
  className?: string;
}

/** Badge, serif heading and optional lead paragraph that open every landing section. */
export function SectionIntro({
  badge,
  title,
  lead,
  id,
  align = 'center',
  className,
}: SectionIntroProps) {
  const center = align === 'center';
  return (
    <Reveal className={cn(center && 'mx-auto max-w-3xl text-center', className)}>
      <SectionBadge>{badge}</SectionBadge>
      <h2 id={id} className="mt-5 text-balance font-serif text-lp-h2 text-lp-ink">
        {title}
      </h2>
      {lead ? (
        <p
          className={cn(
            'mt-4 text-pretty text-lp-lead text-lp-muted',
            center && 'mx-auto max-w-2xl',
          )}
        >
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}

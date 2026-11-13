import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FRAME, FRAME_OUTER } from './frame';

interface LandingSectionProps {
  id?: string;
  labelledBy?: string;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}

/**
 * One band of the page: a hairline on top, then the centred content frame with thin
 * vertical rules on either side (the editorial frame that runs the length of the page).
 */
export function LandingSection({
  id,
  labelledBy,
  children,
  className,
  innerClassName,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn('scroll-mt-24 border-t border-lp-line', FRAME_OUTER, className)}
    >
      <div className={cn(FRAME, 'py-20 md:py-28', innerClassName)}>{children}</div>
    </section>
  );
}

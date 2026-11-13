import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

const VARIANT = {
  primary: 'bg-lp-ink text-lp-bg shadow-raised hover:opacity-90',
  secondary: 'border border-lp-line bg-white text-lp-ink shadow-raised hover:border-lp-muted',
  ghost: 'text-lp-ink hover:bg-white',
} as const;

const SIZE = {
  sm: 'h-9 px-4 text-body',
  md: 'h-11 px-5 text-body',
  lg: 'h-12 px-6 text-body-lg',
} as const;

interface PillLinkProps {
  /** Route path (opens the app) or in-page hash (#section). */
  to: string;
  children: ReactNode;
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  arrow?: boolean;
  className?: string;
  onClick?: () => void;
}

/** Rounded pill call to action. Hash targets stay in-page; paths use the router. */
export function PillLink({
  to,
  children,
  variant = 'primary',
  size = 'md',
  arrow,
  className,
  onClick,
}: PillLinkProps) {
  const classes = cn(
    'group inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition duration-180 ease-standard',
    VARIANT[variant],
    SIZE[size],
    className,
  );
  const content = (
    <>
      {children}
      {arrow ? (
        <ArrowRight
          className="size-4 transition-transform duration-180 ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none"
          strokeWidth={1.75}
          aria-hidden
        />
      ) : null}
    </>
  );
  return to.startsWith('#') ? (
    <a href={to} className={classes} onClick={onClick}>
      {content}
    </a>
  ) : (
    <Link to={to} className={classes} onClick={onClick}>
      {content}
    </Link>
  );
}

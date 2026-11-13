import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-caption [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        plain: 'px-0 text-text-muted',
        outline: 'ring-1 ring-inset ring-border text-text-muted',
        neutral: 'bg-surface-muted text-text-muted',
        info: 'bg-info-bg text-info-fg',
        brand: 'bg-brand-soft text-brand',
        red: 'bg-red-bg text-red-fg ring-1 ring-inset ring-red-border',
        amber: 'bg-amber-bg text-amber-fg ring-1 ring-inset ring-amber-border',
        green: 'bg-green-bg text-green-fg',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

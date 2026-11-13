import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-caption [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        outline: 'border border-border text-text-muted',
        neutral: 'bg-surface-muted text-text-muted',
        info: 'bg-info-bg text-info-fg',
        brand: 'bg-brand-soft text-brand',
        red: 'border border-red-border bg-red-bg text-red-fg',
        amber: 'border border-amber-border bg-amber-bg text-amber-fg',
        green: 'border border-green-border bg-green-bg text-green-fg',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded font-medium transition-colors duration-120 ease-standard disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-white shadow-raised hover:opacity-90 disabled:bg-surface-muted disabled:text-text-subtle disabled:shadow-none',
        secondary:
          'border border-border-strong bg-surface text-text shadow-raised hover:border-text-subtle hover:bg-surface-muted disabled:text-text-subtle disabled:shadow-none',
        ghost: 'text-text-muted hover:bg-surface-muted hover:text-text disabled:text-text-subtle',
        danger: 'bg-red-fg text-white hover:opacity-90 disabled:opacity-50',
      },
      size: {
        sm: 'h-8 px-3 text-small',
        md: 'h-9 px-4 text-body',
        lg: 'h-11 px-5 text-body',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, icon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading ? <Loader2 className="animate-spin" strokeWidth={1.75} aria-hidden /> : icon}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

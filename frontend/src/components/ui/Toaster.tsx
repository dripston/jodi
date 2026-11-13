import * as ToastPrimitive from '@radix-ui/react-toast';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { dismissToast, useToasts, type ToastTone } from './toast-store';

const ICON: Record<ToastTone, typeof Info> = { neutral: Info, error: CircleAlert, success: CircleCheck };
const ICON_TONE: Record<ToastTone, string> = {
  neutral: 'text-text-muted',
  error: 'text-red-fg',
  success: 'text-green-fg',
};

export function Toaster() {
  const toasts = useToasts();
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={(open) => !open && dismissToast(t.id)}
            className="flex w-80 items-start gap-3 rounded border border-border bg-surface p-4 shadow-popover data-[state=open]:animate-fade-in"
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', ICON_TONE[t.tone])} strokeWidth={1.75} aria-hidden />
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="text-body font-medium text-text">{t.title}</ToastPrimitive.Title>
              {t.description ? (
                <ToastPrimitive.Description className="mt-0.5 text-small text-text-muted">
                  {t.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close aria-label="Dismiss" className="text-text-subtle hover:text-text">
              <X className="size-4" strokeWidth={1.75} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}

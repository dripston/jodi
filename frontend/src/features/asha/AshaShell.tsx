import type { ReactNode } from 'react';

/** Mobile-first column; on wider screens it sits centred like a phone-width sheet. */
export function AshaShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto min-h-screen w-full max-w-120 bg-bg sm:border-x sm:border-border">{children}</div>
    </div>
  );
}

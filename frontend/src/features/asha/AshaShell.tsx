import type { ReactNode } from 'react';

interface AshaShellProps {
  /** Desktop sidebar; hidden below lg, where the header and bottom bar take over. */
  sidebar: ReactNode;
  children: ReactNode;
}

/** ASHA workspace frame: sidebar + content on desktop, a single column on phones. */
export function AshaShell({ sidebar, children }: AshaShellProps) {
  return (
    <div className="min-h-screen bg-bg lg:flex">
      {sidebar}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

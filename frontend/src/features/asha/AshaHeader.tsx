import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';

export function AshaHeader({ back, children }: { back: { to: string; label: string }; children: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg px-4 pb-5 pt-2">
      <div className="flex h-12 items-center justify-between">
        <Link to={back.to} className="-ml-2 inline-flex h-12 items-center gap-1.5 rounded px-2 text-body text-text-muted hover:text-text">
          <ArrowLeft className="size-5" strokeWidth={1.75} aria-hidden />
          {back.label}
        </Link>
        <Logo compact />
      </div>
      <div className="mt-2">{children}</div>
    </header>
  );
}

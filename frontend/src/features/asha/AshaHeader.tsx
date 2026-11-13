import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';

export function AshaHeader({ back, children }: { back: { to: string; label: string }; children: ReactNode }) {
  return (
    <header className="border-b border-border bg-surface px-4 pb-4 pt-3">
      <div className="flex h-11 items-center justify-between">
        <Link to={back.to} className="inline-flex h-11 items-center gap-1.5 text-small text-text-muted hover:text-text">
          <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
          {back.label}
        </Link>
        <Logo />
      </div>
      <div className="mt-2">{children}</div>
    </header>
  );
}

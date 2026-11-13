import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/cn';
import { ASHA_CONTAINER } from './layout';

interface AshaHeaderProps {
  back: { to: string; label: string };
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}

/**
 * Phones and tablets get a slim sticky bar (back link + logo); on desktop the sidebar
 * carries navigation, so only the page title block remains.
 */
export function AshaHeader({ back, eyebrow, title, children }: AshaHeaderProps) {
  return (
    <header>
      <div className="sticky top-0 z-20 border-b border-border bg-bg lg:hidden">
        <div className={cn(ASHA_CONTAINER, 'flex h-14 items-center justify-between')}>
          <Link
            to={back.to}
            className="-ml-2 inline-flex h-12 items-center gap-1.5 rounded px-2 text-body text-text-muted hover:text-text"
          >
            <ArrowLeft className="size-5" strokeWidth={1.75} aria-hidden />
            {back.label}
          </Link>
          <Logo compact />
        </div>
      </div>
      <div className={cn(ASHA_CONTAINER, 'pb-6 pt-6 lg:pb-8 lg:pt-10')}>
        {eyebrow ? <p className="text-eyebrow text-text-subtle">{eyebrow}</p> : null}
        <h1 className="mt-1 text-title text-text">{title}</h1>
        {children}
      </div>
    </header>
  );
}

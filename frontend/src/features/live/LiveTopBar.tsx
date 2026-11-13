import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/cn';

export function LiveTopBar({ error }: { error: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-surface px-4 md:px-6">
      <Link to="/app" aria-label="Back to dashboard">
        <Logo />
      </Link>
      <span aria-hidden className="h-5 w-px bg-border" />
      <span className="hidden text-body text-text-muted sm:inline">Live board · Demo District</span>
      <span className={cn('ml-auto inline-flex items-center gap-2 text-small', error ? 'text-red-fg' : 'text-text-muted')}>
        <span aria-hidden className={cn('size-2 rounded-full', error ? 'bg-red-fg' : 'bg-green-fg')} />
        {error ? 'Reconnecting' : 'Live'}
      </span>
      <span className="tabular text-small text-text-muted">
        {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </header>
  );
}

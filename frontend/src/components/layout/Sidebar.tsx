import { NavLink } from 'react-router-dom';
import { useOpenTickets } from '@/api/queries';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';
import { PRIMARY_NAV, SECONDARY_NAV, type NavItem } from './nav';

function AlertCount() {
  const { data } = useOpenTickets();
  const open = data?.filter((t) => t.state === 'open' || t.state === 'notified') ?? [];
  if (!open.length) return null;
  const hasRed = open.some((t) => t.level === 'red');
  return (
    <span
      className={cn(
        'tabular ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-caption',
        hasRed ? 'bg-red-fg text-white' : 'bg-surface-muted text-text-muted',
      )}
      aria-label={`${open.length} open alerts`}
    >
      {open.length}
    </span>
  );
}

function Item({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex h-9 items-center gap-3 rounded px-3 text-body font-medium transition-colors duration-120 ease-standard',
          isActive
            ? 'bg-brand-soft text-brand before:absolute before:inset-y-2 before:-left-3 before:w-0.75 before:rounded-full before:bg-brand'
            : 'text-text-muted hover:bg-surface-muted hover:text-text',
        )
      }
    >
      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      {item.label}
      {item.badge === 'alerts' ? <AlertCount /> : null}
    </NavLink>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex h-full w-sidebar flex-col border-r border-border bg-surface px-3 py-4">
      <div className="px-3 pb-6 pt-1">
        <Logo />
      </div>
      <div className="space-y-0.5">
        {PRIMARY_NAV.map((item) => (
          <Item key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="my-4 border-t border-border" />
      <div className="space-y-0.5">
        {SECONDARY_NAV.map((item) => (
          <Item key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="mt-auto rounded border border-border px-3 py-2.5">
        <p className="text-caption text-text-muted">Pilot</p>
        <p className="text-small font-medium text-text">Demo District</p>
      </div>
    </nav>
  );
}

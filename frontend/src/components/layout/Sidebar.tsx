import { NavLink } from 'react-router-dom';
import { useOpenTickets } from '@/api/queries';
import { cn } from '@/lib/cn';
import { DistrictSelector } from './DistrictSelector';
import { Logo } from './Logo';
import { NAV_GROUPS, type NavItem } from './nav';

function AlertCount() {
  const { data } = useOpenTickets();
  const open = data?.filter((t) => t.state === 'open' || t.state === 'notified') ?? [];
  if (!open.length) return null;
  const hasRed = open.some((t) => t.level === 'red');
  return (
    <span
      className={cn(
        'tabular ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-caption',
        hasRed ? 'bg-red-fg text-white' : 'bg-amber-bg text-amber-fg',
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
          'group relative flex h-9 items-center gap-3 rounded px-2.5 text-body transition-colors duration-120 ease-standard',
          isActive
            ? 'bg-surface font-medium text-text shadow-raised ring-1 ring-border'
            : 'text-text-muted hover:bg-surface-muted hover:text-text',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn('size-4.5 shrink-0', isActive ? 'text-brand' : 'text-text-subtle group-hover:text-text-muted')}
            strokeWidth={1.75}
            aria-hidden
          />
          {item.label}
          {item.badge === 'alerts' ? <AlertCount /> : null}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex h-full w-sidebar flex-col border-r border-border bg-bg px-3 pb-4 pt-5">
      <div className="px-2.5">
        <Logo />
      </div>
      <div className="mt-5">
        <DistrictSelector />
      </div>
      <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 text-eyebrow text-text-subtle">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Item key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="px-2.5 pt-4 text-caption font-normal leading-relaxed text-text-subtle">
        Synthetic demo data. Clinical rules are drafts pending clinician review.
      </p>
    </nav>
  );
}

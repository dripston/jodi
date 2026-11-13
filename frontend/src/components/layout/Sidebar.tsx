import { NavLink } from 'react-router-dom';
import { useOpenTickets } from '@/api/queries';
import { cn } from '@/lib/cn';
import { DistrictSelector } from './DistrictSelector';
import { Logo } from './Logo';
import { NAV_GROUPS, type NavItem } from './nav';
import { CompactDistrict, RailTip, SidebarToggle } from './SidebarRail';

function useAlertCount() {
  const { data } = useOpenTickets();
  const open = data?.filter((t) => t.state === 'open' || t.state === 'notified') ?? [];
  return { count: open.length, hasRed: open.some((t) => t.level === 'red') };
}

type Alerts = ReturnType<typeof useAlertCount>;

function AlertCount({
  collapsed,
  alerts: { count, hasRed },
}: {
  collapsed: boolean;
  alerts: Alerts;
}) {
  if (!count) return null;
  if (collapsed) {
    return (
      <span
        aria-label={`${count} open alerts`}
        className={cn(
          'absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-bg',
          hasRed ? 'bg-red-fg' : 'bg-amber-fg',
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        'tabular ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-caption',
        hasRed ? 'bg-red-fg text-white' : 'bg-amber-bg text-amber-fg',
      )}
      aria-label={`${count} open alerts`}
    >
      {count}
    </span>
  );
}

interface ItemProps {
  item: NavItem;
  collapsed: boolean;
  alerts: Alerts;
  onNavigate?: () => void;
}

function Item({ item, collapsed, alerts, onNavigate }: ItemProps) {
  const Icon = item.icon;
  const tip =
    item.badge === 'alerts' && alerts.count ? `${item.label} · ${alerts.count} open` : item.label;
  return (
    <RailTip show={collapsed} content={tip}>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'group relative flex h-9 items-center gap-3 whitespace-nowrap rounded px-2.5 text-body transition-colors duration-120 ease-standard',
            isActive
              ? 'bg-surface font-medium text-text shadow-raised ring-1 ring-border'
              : 'text-text-muted hover:bg-surface-muted hover:text-text',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={cn(
                'size-4.5 shrink-0',
                isActive ? 'text-brand' : 'text-text-subtle group-hover:text-text-muted',
              )}
              strokeWidth={1.75}
              aria-hidden
            />
            {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
            {item.badge === 'alerts' ? <AlertCount collapsed={collapsed} alerts={alerts} /> : null}
          </>
        )}
      </NavLink>
    </RailTip>
  );
}

interface SidebarProps {
  onNavigate?: () => void;
  /** Icon rail: labels and headings hidden, tooltips on every item. */
  collapsed?: boolean;
  /** Shows the collapse control (desktop and tablet frame only). */
  onToggle?: () => void;
}

export function Sidebar({ onNavigate, collapsed = false, onToggle }: SidebarProps) {
  const alerts = useAlertCount();
  return (
    <nav
      aria-label="Main"
      className="flex h-full w-full flex-col border-r border-border bg-bg px-3 pb-4 pt-5"
    >
      <div className="px-2.5">
        <Logo compact={collapsed} />
      </div>
      <div className="mt-5">{collapsed ? <CompactDistrict /> : <DistrictSelector />}</div>
      <div className="mt-6 flex-1 space-y-6 overflow-y-auto overflow-x-hidden">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {collapsed ? (
              <span aria-hidden className="mx-2.5 mb-1.5 block h-px bg-border" />
            ) : (
              <p className="mb-1.5 whitespace-nowrap px-2.5 text-eyebrow text-text-subtle">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Item
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  alerts={alerts}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3 pt-4">
        {onToggle ? <SidebarToggle collapsed={collapsed} onToggle={onToggle} /> : null}
        {collapsed ? null : (
          <p className="px-2.5 text-caption font-normal leading-relaxed text-text-subtle">
            Synthetic demo data. Clinical rules are drafts pending clinician review.
          </p>
        )}
      </div>
    </nav>
  );
}

import { MapPin, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';

/**
 * Wraps a sidebar control in a right-side tooltip, only while the sidebar is collapsed to the rail.
 * The tooltip anchors on a wrapper span (focus bubbles from the link inside), because Radix's Slot
 * would stringify NavLink's function className if it were the trigger itself.
 */
export function RailTip({
  show,
  content,
  children,
}: {
  show: boolean;
  content: ReactNode;
  children: ReactElement;
}) {
  return show ? (
    <Tooltip content={content} side="right">
      <span className="block">{children}</span>
    </Tooltip>
  ) : (
    children
  );
}

/** Collapse / expand control, styled like a quiet sidebar item. */
export function SidebarToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  return (
    <RailTip show={collapsed} content={label}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={!collapsed}
        className="flex h-9 w-full cursor-pointer items-center gap-3 whitespace-nowrap rounded px-2.5 text-body text-text-muted transition-colors duration-120 ease-standard hover:bg-surface-muted hover:text-text"
      >
        <Icon className="size-4.5 shrink-0 text-text-subtle" strokeWidth={1.75} aria-hidden />
        {collapsed ? null : 'Collapse'}
      </button>
    </RailTip>
  );
}

/** Rail version of the district selector: the pin, with the district in a tooltip. */
export function CompactDistrict() {
  return (
    <RailTip show content="Demo District · Karnataka pilot">
      <div
        role="group"
        aria-label="District: Demo District, Karnataka pilot"
        className="flex h-10 w-full items-center justify-center rounded border border-border bg-surface shadow-raised"
      >
        <MapPin className="size-4 text-text-muted" strokeWidth={1.75} aria-hidden />
      </div>
    </RailTip>
  );
}

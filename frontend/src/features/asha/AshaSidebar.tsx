import { LayoutDashboard } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAshas } from '@/api/queries';
import type { Asha } from '@/api/schemas';
import { Logo } from '@/components/layout/Logo';
import { ResizableSidebar } from '@/components/layout/ResizableSidebar';
import { RailTip, SidebarToggle } from '@/components/layout/SidebarRail';
import { AshaIdentity, SidebarGroup } from './AshaSidebarParts';
import { initials, navItemClass } from './layout';

interface AshaSidebarProps {
  /** The ASHA whose list is open; shown as an identity card above the switcher. */
  current?: Asha;
}

/**
 * Desktop-only navigation for the ASHA workspace. Phones use the header and bottom bar instead.
 * Uses the same resizable / collapsible frame as the main app sidebar, so state is shared.
 */
export function AshaSidebar({ current }: AshaSidebarProps) {
  return (
    <ResizableSidebar className="hidden lg:block">
      {(collapsed, toggle) => (
        <AshaSidebarNav current={current} collapsed={collapsed} onToggle={toggle} />
      )}
    </ResizableSidebar>
  );
}

function AshaSidebarNav({
  current,
  collapsed,
  onToggle,
}: AshaSidebarProps & { collapsed: boolean; onToggle: () => void }) {
  const { data: ashas } = useAshas();
  return (
    <nav
      aria-label="ASHA workspace"
      className="flex h-full w-full flex-col border-r border-border bg-bg px-3 pb-4 pt-5"
    >
      <Link to="/ashas" className="rounded px-2.5" aria-label="Jodi ASHA workspace">
        <span className="flex items-center gap-2.5 whitespace-nowrap">
          <Logo compact={collapsed} />
          {collapsed ? null : <span className="text-eyebrow text-text-subtle">ASHA</span>}
        </span>
      </Link>
      {current ? (
        <div className="mt-5">
          <AshaIdentity asha={current} collapsed={collapsed} />
        </div>
      ) : null}
      <div className="mt-6 flex-1 space-y-6 overflow-y-auto overflow-x-hidden">
        <SidebarGroup label="ASHAs" collapsed={collapsed}>
          {ashas?.map((a) => (
            <RailTip
              key={a.id}
              show={collapsed}
              content={`${a.name} · ${a.village}${a.open_tasks ? ` · ${a.open_tasks} to visit` : ''}`}
            >
              <NavLink to={`/asha/${a.id}`} className={({ isActive }) => navItemClass(isActive)}>
                {collapsed ? (
                  <>
                    <span
                      aria-hidden
                      className="flex size-4.5 shrink-0 items-center justify-center text-caption font-semibold"
                    >
                      {initials(a.name)}
                    </span>
                    <span className="sr-only">{a.name}</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">{a.name}</span>
                    <span className="truncate text-caption font-normal text-text-subtle">
                      {a.village}
                    </span>
                    {a.open_tasks ? (
                      <span
                        className="tabular ml-auto text-caption text-text-muted"
                        aria-label={`${a.open_tasks} to visit`}
                      >
                        {a.open_tasks}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            </RailTip>
          ))}
        </SidebarGroup>
      </div>
      <div className="space-y-3 border-t border-border pt-3">
        <RailTip show={collapsed} content="District dashboard">
          <Link to="/app" className={navItemClass(false)}>
            <LayoutDashboard
              className="size-4.5 shrink-0 text-text-subtle"
              strokeWidth={1.75}
              aria-hidden
            />
            {collapsed ? <span className="sr-only">District dashboard</span> : 'District dashboard'}
          </Link>
        </RailTip>
        <SidebarToggle collapsed={collapsed} onToggle={onToggle} />
        {collapsed ? null : (
          <p className="px-2.5 text-caption font-normal leading-relaxed text-text-subtle">
            Synthetic demo data. Clinical rules are drafts pending clinician review.
          </p>
        )}
      </div>
    </nav>
  );
}

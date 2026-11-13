/* The resize handle is a focusable role="separator" (WAI-ARIA window splitter pattern).
   jsx-a11y treats every separator as static, so these two rules are off for this file only. */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { clampWidth, setSidebar, SIDEBAR, useMediaQuery, useSidebarState } from './sidebarStore';

interface ResizableSidebarProps {
  /** Visibility per breakpoint, e.g. "hidden md:block". Phones keep their own drawer or header. */
  className?: string;
  children: (collapsed: boolean, toggle: () => void) => ReactNode;
}

/**
 * Shared frame for every sidebar: drag the right edge to resize, or collapse to an icon rail.
 * Desktop (≥1024px) resizes and remembers its state; tablets show the rail and expand on demand.
 */
export function ResizableSidebar({ className, children }: ResizableSidebarProps) {
  const { width, collapsed: storedCollapsed } = useSidebarState();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [tabletOpen, setTabletOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; w: number } | null>(null);

  const collapsed = desktop ? storedCollapsed : !tabletOpen;
  const shown = collapsed ? SIDEBAR.RAIL : desktop ? width : SIDEBAR.DEFAULT;
  const toggle = () =>
    desktop ? setSidebar({ collapsed: !storedCollapsed }) : setTabletOpen((o) => !o);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: shown };
    setDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const next = drag.current.w + e.clientX - drag.current.x;
    if (next < SIDEBAR.SNAP) setSidebar({ collapsed: true }, false);
    else setSidebar({ collapsed: false, width: clampWidth(next) }, false);
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    setSidebar({}, true);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () =>
        width - SIDEBAR.STEP < SIDEBAR.MIN
          ? setSidebar({ collapsed: true })
          : setSidebar({ width: clampWidth(width - SIDEBAR.STEP) }),
      ArrowRight: () =>
        setSidebar(collapsed ? { collapsed: false } : { width: clampWidth(width + SIDEBAR.STEP) }),
      Home: () => setSidebar({ collapsed: false, width: SIDEBAR.MIN }),
      End: () => setSidebar({ collapsed: false, width: SIDEBAR.MAX }),
      Enter: toggle,
    };
    const action = keys[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };

  return (
    <div className={cn('sticky top-0 z-30 h-screen shrink-0', className)}>
      <div
        className={cn(
          'relative h-full',
          !dragging && 'transition-all duration-180 ease-standard motion-reduce:transition-none',
        )}
        style={{ width: shown }}
      >
        <div className="h-full w-full overflow-hidden">{children(collapsed, toggle)}</div>
        {desktop ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuemin={SIDEBAR.RAIL}
            aria-valuemax={SIDEBAR.MAX}
            aria-valuenow={shown}
            tabIndex={0}
            title="Drag to resize. Double-click to reset."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={() => setSidebar({ collapsed: false, width: SIDEBAR.DEFAULT })}
            onKeyDown={onKeyDown}
            className="group absolute inset-y-0 -right-1.5 z-10 flex w-3 cursor-col-resize touch-none justify-center focus-visible:outline-none"
          >
            <span
              aria-hidden
              className={cn(
                'h-full w-0.5 rounded-full transition-colors duration-120',
                dragging
                  ? 'bg-brand'
                  : 'bg-transparent group-hover:bg-border-strong group-focus-visible:bg-brand',
              )}
            />
            <span
              aria-hidden
              className={cn(
                'absolute top-1/2 h-8 w-1 -translate-y-1/2 rounded-full transition-colors duration-120',
                dragging
                  ? 'bg-brand'
                  : 'bg-border-strong group-hover:bg-text-subtle group-focus-visible:bg-brand',
              )}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

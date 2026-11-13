import { useSyncExternalStore } from 'react';

/**
 * One sidebar state for every shell (main app and ASHA workspace), kept in localStorage
 * so width and collapsed state survive route changes and reloads.
 */
export const SIDEBAR = {
  MIN: 200,
  MAX: 360,
  DEFAULT: 240,
  /** Collapsed icon rail. 64px keeps icons where they sit when expanded (12px frame + 10px item padding). */
  RAIL: 64,
  /** Dragging narrower than this snaps to the rail. */
  SNAP: 140,
  STEP: 16,
} as const;

export interface SidebarState {
  width: number;
  collapsed: boolean;
}

const KEY = 'jodi.sidebar.v1';
const DEFAULT_STATE: SidebarState = { width: SIDEBAR.DEFAULT, collapsed: false };

export const clampWidth = (w: number) =>
  Math.min(SIDEBAR.MAX, Math.max(SIDEBAR.MIN, Math.round(w)));

function read(): SidebarState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw === 'object') {
      const r = raw as Partial<SidebarState>;
      return {
        width: typeof r.width === 'number' ? clampWidth(r.width) : SIDEBAR.DEFAULT,
        collapsed: r.collapsed === true,
      };
    }
  } catch {
    /* corrupt or blocked storage: fall back to defaults */
  }
  return DEFAULT_STATE;
}

let state = read();
const listeners = new Set<() => void>();

export function setSidebar(patch: Partial<SidebarState>, persist = true): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  if (!persist || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: state still works for this session */
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSidebarState(): SidebarState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => DEFAULT_STATE,
  );
}

/** True when a media query matches; false on the server. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (l) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', l);
      return () => mql.removeEventListener('change', l);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

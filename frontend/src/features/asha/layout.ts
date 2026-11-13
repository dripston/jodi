import { cn } from '@/lib/cn';

/** Shared content width and gutters for ASHA pages. */
export const ASHA_CONTAINER = 'mx-auto w-full max-w-content px-4 sm:px-6 lg:px-10';

/** Same item styling as the main app sidebar, so the ASHA view feels like part of one product. */
export const navItemClass = (active: boolean) =>
  cn(
    'group flex h-9 w-full cursor-pointer items-center gap-3 whitespace-nowrap rounded px-2.5 text-left text-body transition-colors duration-120 ease-standard',
    active
      ? 'bg-surface font-medium text-text shadow-raised ring-1 ring-border'
      : 'text-text-muted hover:bg-surface-muted hover:text-text',
  );

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

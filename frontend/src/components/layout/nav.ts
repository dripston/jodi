import {
  Activity,
  FileUp,
  LayoutDashboard,
  Phone,
  ScrollText,
  Siren,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'alerts';
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Programme',
    items: [
      { to: '/app', label: 'Overview', icon: LayoutDashboard },
      { to: '/alerts', label: 'Alerts', icon: Siren, badge: 'alerts' },
      { to: '/mothers', label: 'Mothers', icon: Users },
      { to: '/calls', label: 'Calls', icon: Phone },
    ],
  },
  {
    label: 'Field work',
    items: [
      { to: '/onboard', label: 'Onboard', icon: FileUp },
      { to: '/ashas', label: 'ASHAs', icon: Stethoscope },
    ],
  },
  {
    label: 'Records and demo',
    items: [
      { to: '/audit', label: 'Record log', icon: ScrollText },
      { to: '/live', label: 'Live demo', icon: Activity },
    ],
  },
];

export function titleFor(pathname: string): string {
  if (pathname.startsWith('/mothers/')) return 'Mother and baby record';
  const all = NAV_GROUPS.flatMap((g) => g.items);
  return all.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))?.label ?? 'Jodi';
}

export function sectionFor(pathname: string): string | null {
  if (pathname.startsWith('/mothers/')) return 'Mothers';
  return null;
}

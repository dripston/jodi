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

export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/alerts', label: 'Alerts', icon: Siren, badge: 'alerts' },
  { to: '/mothers', label: 'Mothers', icon: Users },
  { to: '/onboard', label: 'Onboard', icon: FileUp },
  { to: '/ashas', label: 'ASHAs', icon: Stethoscope },
  { to: '/calls', label: 'Calls', icon: Phone },
];

export const SECONDARY_NAV: NavItem[] = [
  { to: '/live', label: 'Live demo', icon: Activity },
  { to: '/audit', label: 'Record log', icon: ScrollText },
];

export function titleFor(pathname: string): string {
  const all = [...PRIMARY_NAV, ...SECONDARY_NAV];
  if (pathname.startsWith('/mothers/')) return 'Mother and baby';
  return all.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))?.label ?? 'Jodi';
}

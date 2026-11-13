import {
  Activity,
  FileUp,
  LayoutDashboard,
  Phone,
  ScrollText,
  Siren,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/cn';

const ITEMS = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Alerts', icon: Siren, count: 3 },
  { label: 'Mothers', icon: Users },
  { label: 'Calls', icon: Phone },
  { label: 'Onboard', icon: FileUp },
  { label: 'ASHAs', icon: Stethoscope },
  { label: 'Record log', icon: ScrollText },
  { label: 'Live demo', icon: Activity },
];

/** Static copy of the app sidebar for previews, with one item marked active. */
export function MiniSidebar({ active }: { active: string }) {
  return (
    <div className="hidden w-48 shrink-0 flex-col gap-1 border-r border-border bg-surface p-3 md:flex">
      <Logo className="mb-4 px-1.5" />
      {ITEMS.map(({ label, icon: Icon, count }) => (
        <span
          key={label}
          className={cn(
            'flex h-8 items-center gap-2.5 rounded px-2 text-small',
            label === active ? 'bg-brand-soft font-medium text-brand' : 'text-text-muted',
          )}
        >
          <Icon className="size-4 shrink-0" strokeWidth={1.75} />
          {label}
          {count ? (
            <span className="tabular ml-auto rounded-full bg-red-fg px-1.5 text-caption text-white">
              {count}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

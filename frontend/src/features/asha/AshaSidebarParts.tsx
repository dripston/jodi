import type { ReactNode } from 'react';
import type { Asha } from '@/api/schemas';
import { RailTip } from '@/components/layout/SidebarRail';
import { formatPhone } from '@/lib/format';
import { initials } from './layout';

export function SidebarGroup({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      {collapsed ? (
        <span aria-hidden className="mx-2.5 mb-1.5 block h-px bg-border" />
      ) : (
        <p className="mb-1.5 whitespace-nowrap px-2.5 text-eyebrow text-text-subtle">{label}</p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function AshaIdentity({ asha, collapsed }: { asha: Asha; collapsed: boolean }) {
  if (collapsed) {
    return (
      <RailTip show content={`${asha.name} · ${asha.village}`}>
        <div
          role="group"
          aria-label={`ASHA ${asha.name}, ${asha.village}`}
          className="flex justify-center"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-small font-semibold text-brand">
            {initials(asha.name)}
          </span>
        </div>
      </RailTip>
    );
  }
  return (
    <div className="mx-0.5 flex items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-raised">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-small font-semibold text-brand"
      >
        {initials(asha.name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-body font-medium text-text">{asha.name}</p>
        <p className="tabular truncate text-caption font-normal text-text-subtle">
          {asha.village} · {formatPhone(asha.phone)}
        </p>
      </div>
    </div>
  );
}

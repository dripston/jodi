import { ChevronsUpDown, MapPin } from 'lucide-react';

/** Pilot runs in one district; the selector shows the scope and is ready for more districts. */
export function DistrictSelector() {
  return (
    <div
      className="flex items-center gap-3 rounded border border-border bg-surface px-3 py-2 shadow-raised"
      aria-label="District: Demo District, Karnataka pilot"
      role="group"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-surface-muted text-text-muted">
        <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-small font-medium text-text">Demo District</p>
        <p className="truncate text-caption font-normal text-text-subtle">Karnataka · pilot</p>
      </div>
      <ChevronsUpDown className="size-4 shrink-0 text-text-subtle" strokeWidth={1.75} aria-hidden />
    </div>
  );
}

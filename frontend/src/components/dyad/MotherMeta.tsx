import { User } from 'lucide-react';
import type { Mother } from '@/api/schemas';
import { StatusPill } from '@/components/status/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { complicationLabel, DELIVERY_LABELS, languageLabel } from '@/lib/labels';

export function MotherMeta({ mother, pulse }: { mother: Mother; pulse?: boolean }) {
  return (
    <div className="min-w-0 flex-1 p-5">
      <div className="flex items-center gap-2 text-small text-text-muted">
        <User className="size-4" strokeWidth={1.75} aria-hidden />
        Mother
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-h1 text-text">{mother.name}</h2>
        <StatusPill level={mother.status} pulse={pulse} />
      </div>
      <p className="mt-1 text-body text-text-muted">
        <span className="tabular font-medium text-text">Day {mother.day_since_delivery}</span> since delivery
        <span aria-hidden> · </span>
        {DELIVERY_LABELS[mother.delivery_type]}
        <span aria-hidden> · </span>
        {languageLabel(mother.language)}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {mother.risk_profile === 'high' ? <Badge tone="amber">High-risk profile</Badge> : null}
        {mother.complications.map((c) => (
          <Badge key={c} tone="outline">
            {complicationLabel(c)}
          </Badge>
        ))}
      </div>
    </div>
  );
}

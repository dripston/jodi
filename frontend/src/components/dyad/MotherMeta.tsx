import { User } from 'lucide-react';
import type { Mother } from '@/api/schemas';
import { StatusPill } from '@/components/status/StatusPill';
import { Badge } from '@/components/ui/Badge';
import { complicationLabel, DELIVERY_LABELS, languageLabel } from '@/lib/labels';
import { MetaFacts } from './MetaFacts';

export function MotherMeta({ mother, pulse }: { mother: Mother; pulse?: boolean }) {
  return (
    <div className="min-w-0 flex-1 p-5 md:p-6">
      <p className="flex items-center gap-1.5 text-eyebrow text-text-subtle">
        <User className="size-3.5" strokeWidth={1.75} aria-hidden />
        Mother
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-title text-text">{mother.name}</h2>
        <StatusPill level={mother.status} pulse={pulse} />
      </div>
      <MetaFacts
        items={[
          { label: 'Since delivery', value: `Day ${mother.day_since_delivery}` },
          { label: 'Delivery', value: DELIVERY_LABELS[mother.delivery_type] },
          { label: 'Language', value: languageLabel(mother.language) },
        ]}
      />
      {mother.risk_profile === 'high' || mother.complications.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {mother.risk_profile === 'high' ? <Badge tone="amber">High-risk profile</Badge> : null}
          {mother.complications.map((c) => (
            <Badge key={c} tone="neutral">
              {complicationLabel(c)}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

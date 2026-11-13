import { CircleCheck, Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import type { OnboardingFields } from '@/api/schemas';
import { Badge } from '@/components/ui/Badge';
import { formatGrams, formatShortDate } from '@/lib/format';
import { complicationLabel, DELIVERY_LABELS } from '@/lib/labels';
import { ConfidenceBar } from './ConfidenceBar';

interface FieldRowProps {
  label: string;
  value: ReactNode;
  confidence?: number;
  confirmed: boolean;
}

function FieldRow({ label, value, confidence, confirmed }: FieldRowProps) {
  return (
    <div className="grid grid-cols-5 items-start gap-4 px-5 py-3">
      <dt className="col-span-2 text-small text-text-muted">{label}</dt>
      <dd className="col-span-3 space-y-1.5">
        <p className="text-body font-medium text-text">{value ?? <span className="text-text-subtle">Not found on slip</span>}</p>
        {confirmed ? (
          <Badge tone="green">
            <CircleCheck strokeWidth={1.75} aria-hidden />
            Confirmed by mother
          </Badge>
        ) : (
          <ConfidenceBar value={confidence} />
        )}
      </dd>
    </div>
  );
}

export function ExtractedFieldsForm({ fields, confirmed }: { fields: OnboardingFields; confirmed: boolean }) {
  const c = fields.confidence;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <p className="text-small text-text-muted">Read from the discharge slip</p>
        {confirmed ? null : (
          <Badge tone="outline">
            <Clock strokeWidth={1.75} aria-hidden />
            Pending voice confirmation
          </Badge>
        )}
      </div>
      <dl className="divide-y divide-border border-t border-border">
        <FieldRow label="Delivery date" value={fields.delivery_date ? formatShortDate(fields.delivery_date) : null} confidence={c.delivery_date} confirmed={confirmed} />
        <FieldRow label="Delivery type" value={fields.delivery_type ? DELIVERY_LABELS[fields.delivery_type] : null} confidence={c.delivery_type} confirmed={confirmed} />
        <FieldRow label="Complications" value={fields.complications?.length ? fields.complications.map(complicationLabel).join(', ') : null} confidence={c.complications} confirmed={confirmed} />
        <FieldRow label="Baby's birth weight" value={fields.baby_birth_weight_grams != null ? formatGrams(fields.baby_birth_weight_grams) : null} confidence={c.baby_birth_weight_grams} confirmed={confirmed} />
        <FieldRow label="Gestation" value={fields.gestation_weeks != null ? `${fields.gestation_weeks} weeks` : null} confidence={c.gestation_weeks} confirmed={confirmed} />
        <FieldRow
          label="Medicines"
          value={fields.medicines?.length ? fields.medicines.map((m) => `${m.name} ${m.dose}, ${m.frequency}`).join('; ') : null}
          confidence={c.medicines}
          confirmed={confirmed}
        />
      </dl>
    </div>
  );
}

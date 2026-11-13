import type { ReactNode } from 'react';
import type { Asha, Baby, Mother } from '@/api/schemas';
import { Card, CardHeader } from '@/components/ui/Card';
import { babyName } from '@/lib/dyad';
import { formatAbsolute, formatGrams, formatPhone, formatShortDate } from '@/lib/format';
import { complicationLabel, DELIVERY_LABELS, languageLabel, relationLabel } from '@/lib/labels';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 px-5 py-3">
      <dt className="text-small text-text-muted">{label}</dt>
      <dd className="col-span-2 text-body text-text">{children}</dd>
    </div>
  );
}

export function DetailsTab({ mother, baby, asha }: { mother: Mother; baby: Baby; asha?: Asha }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Mother" />
        <dl className="mt-3 divide-y divide-border border-t border-border">
          <Row label="Name">{mother.name}</Row>
          <Row label="Phone"><span className="tabular">{formatPhone(mother.phone)}</span></Row>
          <Row label="Language">{languageLabel(mother.language)}</Row>
          <Row label="Delivery">{DELIVERY_LABELS[mother.delivery_type]} · {formatShortDate(mother.delivery_date)}</Row>
          <Row label="Complications">{mother.complications.length ? mother.complications.map(complicationLabel).join(', ') : 'None recorded'}</Row>
          <Row label="Risk profile">{mother.risk_profile === 'high' ? 'High risk (daily calls days 1–10)' : 'Standard'}</Row>
          <Row label="Consent">{mother.consent_at ? formatAbsolute(mother.consent_at) : 'Not recorded'}</Row>
        </dl>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Baby" />
          <dl className="mt-3 divide-y divide-border border-t border-border">
            <Row label="Name">{babyName(baby, mother)}</Row>
            <Row label="Birth weight">{baby.birth_weight_grams !== null ? formatGrams(baby.birth_weight_grams) : 'Not recorded'}</Row>
            <Row label="Gestation">{baby.gestation_weeks !== null ? `${baby.gestation_weeks} weeks` : 'Not recorded'}</Row>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Contacts" description="Only these phones can hear her history." />
          <dl className="mt-3 divide-y divide-border border-t border-border">
            {mother.family_phones.map((f) => (
              <Row key={f.phone} label={relationLabel(f.relation)}>
                {f.name} · <span className="tabular">{formatPhone(f.phone)}</span>
                {f.decision_maker ? <span className="text-text-muted"> · decision-maker</span> : null}
              </Row>
            ))}
            {asha ? (
              <Row label="ASHA">
                {asha.name} · <span className="tabular">{formatPhone(asha.phone)}</span>
              </Row>
            ) : null}
          </dl>
        </Card>
      </div>
    </div>
  );
}

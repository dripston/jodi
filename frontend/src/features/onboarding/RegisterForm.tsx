import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAshas } from '@/api/queries';
import type { FamilyInput, OnboardingFields, RegisterInput } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const LANGUAGES = [
  { value: 'kn', label: 'Kannada' },
  { value: 'hi', label: 'Hindi' },
  { value: 'en', label: 'English' },
];
const DELIVERY = [
  { value: 'normal', label: 'Normal' },
  { value: 'c_section', label: 'C-section' },
  { value: 'assisted', label: 'Assisted (forceps / vacuum)' },
];
const RELATIONS = [
  { value: 'husband', label: 'Husband' },
  { value: 'mother', label: 'Mother' },
  { value: 'mother_in_law', label: 'Mother-in-law' },
  { value: 'sister', label: 'Sister' },
  { value: 'other', label: 'Other' },
];

const blankFamily = (): FamilyInput => ({ name: '', relation: 'husband', phone: '', decision_maker: false });

interface Props {
  phone: string;
  fields: OnboardingFields | null;
  disabled: boolean;
  saving: boolean;
  onSubmit: (input: RegisterInput) => void;
}

/** Her real details, checked by the ASHA. The slip fields (OCR) are used as read unless changed here. */
export function RegisterForm({ phone, fields, disabled, saving, onSubmit }: Props) {
  const ashas = useAshas();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('kn');
  const [ashaId, setAshaId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(fields?.delivery_date ?? '');
  const [deliveryType, setDeliveryType] = useState<string>(fields?.delivery_type ?? 'normal');
  const [family, setFamily] = useState<FamilyInput[]>([blankFamily()]);

  useEffect(() => {
    if (fields?.delivery_date) setDeliveryDate(fields.delivery_date);
    if (fields?.delivery_type) setDeliveryType(fields.delivery_type);
  }, [fields?.delivery_date, fields?.delivery_type]);
  useEffect(() => {
    if (!ashaId && ashas.data?.[0]) setAshaId(ashas.data[0].id);
  }, [ashas.data, ashaId]);

  const setMember = (i: number, patch: Partial<FamilyInput>) =>
    setFamily((f) => f.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const validFamily = family.filter((f) => f.phone.replace(/\D/g, '').length >= 10);
  const ready = name.trim().length > 1 && deliveryDate !== '' && validFamily.length > 0 && !disabled;

  const submit = () =>
    onSubmit({
      phone,
      name: name.trim(),
      language,
      asha_id: ashaId || undefined,
      delivery_date: deliveryDate,
      delivery_type: deliveryType,
      family: validFamily.map((f, i) => ({ ...f, decision_maker: i === 0 })),
    });

  return (
    <div className="space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="reg-name" className="text-small text-text-muted">Her name</label>
          <Input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="As she wants to be called" disabled={disabled} />
        </div>
        <div className="space-y-1">
          <span className="text-small text-text-muted">Language for calls</span>
          <Select value={language} onValueChange={setLanguage} options={LANGUAGES} label="Language" className="w-full" />
        </div>
        <div className="space-y-1">
          <label htmlFor="reg-date" className="text-small text-text-muted">Delivery date</label>
          <Input id="reg-date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} disabled={disabled} />
        </div>
        <div className="space-y-1">
          <span className="text-small text-text-muted">Delivery type</span>
          <Select value={deliveryType} onValueChange={setDeliveryType} options={DELIVERY} label="Delivery type" className="w-full" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <span className="text-small text-text-muted">Her ASHA</span>
          <Select
            value={ashaId}
            onValueChange={setAshaId}
            options={(ashas.data ?? []).map((a) => ({ value: a.id, label: `${a.name} · ${a.village}` }))}
            label="ASHA"
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-small text-text-muted">
          Family to call in an emergency <span className="text-text-subtle">(the first person decides about going to hospital)</span>
        </p>
        {family.map((m, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_10rem_1fr_auto]">
            <Input value={m.name} onChange={(e) => setMember(i, { name: e.target.value })} placeholder="Name" aria-label="Family member name" disabled={disabled} />
            <Select value={m.relation} onValueChange={(v) => setMember(i, { relation: v })} options={RELATIONS} label="Relation" className="w-full" />
            <Input value={m.phone} onChange={(e) => setMember(i, { phone: e.target.value })} inputMode="tel" placeholder="Phone number" aria-label="Family member phone" className="tabular" disabled={disabled} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove"
              icon={<Trash2 strokeWidth={1.75} />}
              disabled={disabled || family.length === 1}
              onClick={() => setFamily((f) => f.filter((_, j) => j !== i))}
            />
          </div>
        ))}
        <Button variant="ghost" size="sm" icon={<Plus strokeWidth={1.75} />} disabled={disabled || family.length >= 3} onClick={() => setFamily((f) => [...f, blankFamily()])}>
          Add family member
        </Button>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" disabled={!ready} loading={saving} onClick={submit}>
          Create health record
        </Button>
      </div>
    </div>
  );
}

import { Phone } from 'lucide-react';
import type { Mother } from '@/api/schemas';
import { formatPhone } from '@/lib/format';
import { relationLabel } from '@/lib/labels';

interface Contact {
  name: string;
  role: string;
  phone: string;
  decides: boolean;
}

function contactsOf(mother: Mother): Contact[] {
  return [
    { name: mother.name, role: 'Mother', phone: mother.phone, decides: false },
    ...mother.family_phones.map((f) => ({
      name: f.name,
      role: relationLabel(f.relation),
      phone: f.phone,
      decides: f.decision_maker,
    })),
  ];
}

/** Every number the ASHA can try, mother first. Each row is a real tel: link. */
export function VisitContacts({ mother }: { mother: Mother }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {contactsOf(mother).map((c) => (
        <li key={`${c.role}-${c.phone}`}>
          <a
            href={`tel:${c.phone}`}
            aria-label={`Call ${c.name}, ${c.role}`}
            className="group flex min-h-13 items-center gap-3 px-3.5 py-2.5 transition-colors duration-120 hover:bg-surface-muted"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-medium text-text">
                {c.name}
                <span className="ml-2 text-small font-normal text-text-muted">{c.role}</span>
              </p>
              <p className="tabular text-small text-text-muted">
                {formatPhone(c.phone)}
                {c.decides ? (
                  <span className="ml-2 text-caption text-text-subtle">Makes decisions</span>
                ) : null}
              </p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-text-muted transition-colors duration-120 group-hover:border-text-subtle group-hover:text-text">
              <Phone className="size-4" strokeWidth={1.75} aria-hidden />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

import { Baby, User } from 'lucide-react';
import type { Fact } from '@/api/schemas';
import { Badge } from '@/components/ui/Badge';
import { factLabel } from '@/lib/labels';

export function FactList({ facts }: { facts: Fact[] }) {
  if (!facts.length) return <p className="text-small text-text-muted">No facts were extracted from this call.</p>;
  return (
    <ul className="divide-y divide-border rounded border border-border">
      {facts.map((f, i) => {
        const Icon = f.subject === 'baby' ? Baby : User;
        return (
          <li key={`${f.code}-${i}`} className="flex items-start gap-3 px-3 py-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" strokeWidth={1.75} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium text-text">
                {f.present ? '' : 'No '}
                {f.present ? factLabel(f.code, f.subject) : factLabel(f.code, f.subject).toLowerCase()}
              </p>
              {f.value ? <p className="text-small text-text-muted">{f.value}</p> : null}
            </div>
            {f.confidence < 0.75 ? <Badge tone="amber">Check</Badge> : null}
          </li>
        );
      })}
    </ul>
  );
}

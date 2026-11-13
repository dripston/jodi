import { Phone, PhoneMissed, PhoneOutgoing, Stethoscope } from 'lucide-react';
import type { ReactNode } from 'react';
import { useStats } from '@/api/queries';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className="text-text-muted [&_svg]:size-4">{icon}</span>
      <span className="text-body text-text">{label}</span>
      <span className="tabular ml-auto text-h3 text-text">{value}</span>
    </li>
  );
}

export function TodayPanel() {
  const { data } = useStats();
  const c = data?.calls_today;
  const pct = c && c.scheduled ? Math.round((c.completed / c.scheduled) * 100) : 0;
  return (
    <Card>
      {c && data ? (
        <>
          <div className="px-5 pt-5">
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${pct}% of scheduled calls completed`}>
              <div className="bg-brand transition-all duration-240" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-small text-text-muted">
              <span className="tabular font-medium text-text">{pct}%</span> of scheduled calls completed
            </p>
          </div>
          <ul className="mt-2 divide-y divide-border">
            <Row icon={<PhoneOutgoing strokeWidth={1.75} />} label="Calls scheduled" value={c.scheduled} />
            <Row icon={<Phone strokeWidth={1.75} />} label="Completed" value={c.completed} />
            <Row icon={<PhoneMissed strokeWidth={1.75} />} label="Missed" value={c.missed} />
            <Row icon={<Stethoscope strokeWidth={1.75} />} label="ASHA tasks open" value={data.asha_tasks_open} />
          </ul>
        </>
      ) : (
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      )}
    </Card>
  );
}

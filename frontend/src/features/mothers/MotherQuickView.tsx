import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTimeline } from '@/api/queries';
import type { Asha, Mother } from '@/api/schemas';
import { DyadHeader } from '@/components/dyad/DyadHeader';
import { Timeline } from '@/components/timeline/Timeline';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Skeleton } from '@/components/ui/Skeleton';

interface MotherQuickViewProps {
  mother: Mother | null;
  asha?: Asha;
  onClose: () => void;
}

export function MotherQuickView({ mother, asha, onClose }: MotherQuickViewProps) {
  const timeline = useTimeline(mother?.id ?? '');
  return (
    <Drawer
      open={mother !== null}
      onOpenChange={(o) => !o && onClose()}
      title={mother?.name ?? ''}
      description={mother ? `Day ${mother.day_since_delivery} · quick view` : undefined}
      footer={
        mother ? (
          <Button asChild variant="primary">
            <Link to={`/mothers/${mother.id}`}>
              Open profile
              <ArrowRight strokeWidth={1.75} />
            </Link>
          </Button>
        ) : null
      }
    >
      {mother?.baby ? (
        <div className="space-y-6">
          <DyadHeader mother={mother} baby={mother.baby} asha={asha} compact />
          <div>
            <h3 className="mb-2 text-h3 text-text">Latest entries</h3>
            {timeline.data ? (
              <Timeline entries={timeline.data.slice(0, 5)} deliveryDate={mother.delivery_date} sticky={false} />
            ) : (
              <Skeleton className="h-40" />
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}

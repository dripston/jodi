import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/data/EmptyState';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="This page does not exist"
      description="Check the address, or go back to the overview."
      action={
        <Button asChild>
          <Link to="/">Go to overview</Link>
        </Button>
      }
    />
  );
}

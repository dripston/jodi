import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PageSkeleton } from './PageSkeleton';

export function BareLayout() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-8">
          <PageSkeleton />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}

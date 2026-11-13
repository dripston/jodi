import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ResizableSidebar } from '@/components/layout/ResizableSidebar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { sectionFor, titleFor } from '@/components/layout/nav';
import { PageSkeleton } from './PageSkeleton';

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('/mothers?focus=search');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className="flex min-h-screen">
      <ResizableSidebar className="hidden md:block">
        {(collapsed, toggle) => <Sidebar collapsed={collapsed} onToggle={toggle} />}
      </ResizableSidebar>
      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay md:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 shadow-overlay md:hidden">
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Main navigation
            </DialogPrimitive.Description>
            <div className="h-full w-sidebar">
              <Sidebar onNavigate={() => setMenuOpen(false)} />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={titleFor(pathname)}
          section={sectionFor(pathname)}
          onMenu={() => setMenuOpen(true)}
        />
        <main className="mx-auto w-full max-w-content flex-1 px-4 pb-16 pt-6 md:px-8 md:pt-10">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

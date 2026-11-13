import { lazy, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { BareLayout } from './BareLayout';
import { NotFoundPage } from './NotFoundPage';

function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  const Lazy = lazy(async (): Promise<{ default: ComponentType }> => ({ default: (await load())[name] }));
  return <Lazy />;
}

export const router = createBrowserRouter([
  {
    element: <BareLayout />,
    children: [{ path: '/', element: page(() => import('@/features/landing/LandingPage'), 'LandingPage') }],
  },
  {
    element: <AppShell />,
    children: [
      { path: '/app', element: page(() => import('@/features/overview/OverviewPage'), 'OverviewPage') },
      { path: '/alerts', element: page(() => import('@/features/alerts/AlertsPage'), 'AlertsPage') },
      { path: '/mothers', element: page(() => import('@/features/mothers/MothersPage'), 'MothersPage') },
      { path: '/mothers/:id', element: page(() => import('@/features/mothers/MotherProfilePage'), 'MotherProfilePage') },
      { path: '/onboard', element: page(() => import('@/features/onboarding/OnboardPage'), 'OnboardPage') },
      { path: '/calls', element: page(() => import('@/features/calls/CallsPage'), 'CallsPage') },
      { path: '/audit', element: page(() => import('@/features/audit/AuditPage'), 'AuditPage') },
      { path: '/dev/components', element: page(() => import('@/features/dev/ComponentsPage'), 'ComponentsPage') },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <BareLayout />,
    children: [
      { path: '/live', element: page(() => import('@/features/live/LiveBoardPage'), 'LiveBoardPage') },
      { path: '/ashas', element: page(() => import('@/features/asha/AshaIndexPage'), 'AshaIndexPage') },
      { path: '/asha/:id', element: page(() => import('@/features/asha/AshaListPage'), 'AshaListPage') },
      { path: '/share/:token', element: page(() => import('@/features/share/SharePage'), 'SharePage') },
    ],
  },
]);

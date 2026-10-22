import type { ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { PageFallback } from '@/app/layouts/PageFallback'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'

/** Cada pantalla se descarga al visitarla (Recharts, KaTeX y jsPDF no van en la carga inicial). */
const page =
  <M,>(load: () => Promise<M>, pick: (m: M) => ComponentType) =>
  async () => ({ Component: pick(await load()) })

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    HydrateFallback: PageFallback,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            lazy: page(
              () => import('@/features/dashboard/DashboardPage'),
              (m) => m.DashboardPage,
            ),
          },
          {
            path: 'control',
            lazy: page(
              () => import('@/features/control/ControlPage'),
              (m) => m.ControlPage,
            ),
          },
          {
            path: 'analitica',
            lazy: page(
              () => import('@/features/analytics/AnalyticsPage'),
              (m) => m.AnalyticsPage,
            ),
          },
          {
            path: 'alertas',
            lazy: page(
              () => import('@/features/alerts/AlertsPage'),
              (m) => m.AlertsPage,
            ),
          },
          {
            path: 'electronica',
            lazy: page(
              () => import('@/features/electronics-page/ElectronicsPage'),
              (m) => m.ElectronicsPage,
            ),
          },
          {
            path: 'bitacora',
            lazy: page(
              () => import('@/features/audit/AuditPage'),
              (m) => m.AuditPage,
            ),
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]

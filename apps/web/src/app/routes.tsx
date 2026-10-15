import { Navigate, type RouteObject } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { ControlPage } from '@/features/control/ControlPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ElectronicsPage } from '@/features/electronics-page/ElectronicsPage'
import { PlaceholderPage } from '@/features/placeholder/PlaceholderPage'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'control', element: <ControlPage /> },
          { path: 'analitica', element: <PlaceholderPage title="Analítica" block="R10" /> },
          { path: 'alertas', element: <PlaceholderPage title="Alertas" block="R9" /> },
          { path: 'electronica', element: <ElectronicsPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]

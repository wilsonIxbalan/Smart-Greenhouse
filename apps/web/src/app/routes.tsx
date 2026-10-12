import type { RouteObject } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ElectronicsPage } from '@/features/electronics-page/ElectronicsPage'
import { PlaceholderPage } from '@/features/placeholder/PlaceholderPage'

export const routes: RouteObject[] = [
  { path: '/login', element: <PlaceholderPage title="Iniciar sesión" block="B6" /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'control', element: <PlaceholderPage title="Control" block="B9" /> },
      { path: 'analitica', element: <PlaceholderPage title="Analítica" block="B13" /> },
      { path: 'alertas', element: <PlaceholderPage title="Alertas" block="B12" /> },
      { path: 'electronica', element: <ElectronicsPage /> },
      { path: 'admin/usuarios', element: <PlaceholderPage title="Usuarios" block="B15" /> },
    ],
  },
]

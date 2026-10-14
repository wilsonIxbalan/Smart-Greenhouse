import { createBrowserRouter, RouterProvider } from 'react-router'
import { ConfigErrorScreen } from '@/app/ConfigErrorScreen'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'
import { ThemeProvider } from '@/app/theme'
import { Toaster } from '@/components/ui/sonner'
import { SUPABASE_ENV } from '@/lib/env'

const router = createBrowserRouter(routes)

export function App() {
  if (!SUPABASE_ENV.ok) {
    return (
      <ThemeProvider>
        <ConfigErrorScreen problems={SUPABASE_ENV.problems} />
      </ThemeProvider>
    )
  }
  return (
    <AppProviders>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </AppProviders>
  )
}

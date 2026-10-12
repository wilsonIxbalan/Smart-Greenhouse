import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { AppProviders } from '@/app/providers'
import { ThemeProvider } from '@/app/theme'
import { Toaster } from '@/components/ui/sonner'

const router = createBrowserRouter(routes)

export function App() {
  return (
    <AppProviders>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </AppProviders>
  )
}

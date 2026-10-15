import { Bell, LogOut, Moon, Sun } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { BottomNav } from '@/app/layouts/BottomNav'
import { SideNav } from '@/app/layouts/SideNav'
import { useTheme } from '@/app/theme'
import { Button } from '@/components/ui/button'
import { ROLE_LABEL } from '@/config/permissions'
import { useProfile, useSignOut } from '@/features/auth/hooks'
import { useLiveCommands } from '@/features/control/hooks'
import { useLiveReadings } from '@/features/dashboard/hooks'

export function AppLayout() {
  const { theme, toggleTheme } = useTheme()
  const { data: profile } = useProfile()
  const signOut = useSignOut()
  useLiveReadings()
  useLiveCommands()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b bg-background/90 px-4 backdrop-blur">
        <Link to="/" className="font-semibold">
          Invernadero
        </Link>
        <div className="flex min-w-0 items-center gap-1">
          {profile && (
            <span className="hidden truncate pr-2 text-sm text-muted-foreground lg:inline">
              {profile.fullName ?? profile.email} · {ROLE_LABEL[profile.role]}
            </span>
          )}
          <Button variant="ghost" size="icon" asChild className="size-11 lg:hidden">
            <Link to="/alertas" aria-label="Alertas">
              <Bell />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
            aria-label="Cerrar sesión"
          >
            <LogOut />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        <SideNav />
        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-6 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

import { Bell, KeyRound, LogOut, Moon, ScrollText, Sun } from 'lucide-react'
import { Link, Outlet, useNavigation } from 'react-router'
import { BottomNav } from '@/app/layouts/BottomNav'
import { SideNav } from '@/app/layouts/SideNav'
import { useTheme } from '@/app/theme'
import { Button } from '@/components/ui/button'
import { ROLE_LABEL } from '@/config/permissions'
import { usePermissions, useProfile, useSignOut } from '@/features/auth/hooks'
import { useLiveAlerts } from '@/features/alerts/hooks'
import { OpenAlertsBadge } from '@/features/alerts/OpenAlertsBadge'
import { useLiveCommands } from '@/features/control/hooks'
import { useLiveReadings } from '@/features/dashboard/hooks'

export function AppLayout() {
  const { theme, toggleTheme } = useTheme()
  const { data: profile } = useProfile()
  const { can } = usePermissions()
  const signOut = useSignOut()
  const loadingPage = useNavigation().state === 'loading'
  useLiveReadings()
  useLiveCommands()
  useLiveAlerts()

  return (
    <div className="flex min-h-dvh flex-col">
      {loadingPage && (
        <div
          role="progressbar"
          aria-label="Cargando pantalla"
          className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-30 h-0.5 animate-pulse bg-primary"
        />
      )}
      <header className="sticky top-0 z-20 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between gap-2 border-b bg-background/90 pt-[env(safe-area-inset-top)] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur">
        <Link to="/" className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-semibold">Invernadero</span>
          {profile && (
            <span className="truncate text-xs text-muted-foreground lg:hidden">
              {ROLE_LABEL[profile.role]}
            </span>
          )}
        </Link>
        <div className="flex shrink-0 items-center lg:gap-1">
          {profile && (
            <span className="hidden truncate pr-2 text-sm text-muted-foreground lg:inline">
              {profile.fullName ?? profile.email} · {ROLE_LABEL[profile.role]}
            </span>
          )}
          {can('access.view') && (
            <Button variant="ghost" size="icon" asChild className="size-11 lg:hidden">
              <Link to="/accesos" aria-label="Accesos">
                <KeyRound />
              </Link>
            </Button>
          )}
          {can('audit.view') && (
            <Button variant="ghost" size="icon" asChild className="size-11 lg:hidden">
              <Link to="/bitacora" aria-label="Bitácora">
                <ScrollText />
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild className="relative size-11 lg:hidden">
            <Link to="/alertas" aria-label="Alertas">
              <Bell />
              <OpenAlertsBadge className="absolute top-1 right-0.5" />
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
        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-6 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}

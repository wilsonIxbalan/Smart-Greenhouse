import { Navigate, Outlet, useLocation } from 'react-router'
import { CenteredScreen } from '@/components/shared/CenteredScreen'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { AccessDisabled } from '@/features/auth/AccessDisabled'
import { useAuth, useProfile } from '@/features/auth/hooks'

function SessionSkeleton() {
  return (
    <CenteredScreen>
      <div aria-busy="true" aria-label="Comprobando sesión" className="space-y-3">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
      </div>
    </CenteredScreen>
  )
}

/** Guard: sin sesión → /login; sin perfil o inactivo → "Acceso desactivado". */
export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()
  const profile = useProfile()

  if (auth.status === 'loading') return <SessionSkeleton />
  if (auth.status === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (profile.isPending) return <SessionSkeleton />
  if (profile.isError) {
    return (
      <CenteredScreen>
        <ErrorState
          title="No se pudo cargar tu perfil"
          description={profile.error.message}
          onRetry={() => void profile.refetch()}
        />
      </CenteredScreen>
    )
  }
  if (!profile.data?.active) {
    return (
      <AccessDisabled
        email={profile.data?.email ?? auth.email}
        hasProfile={profile.data !== null}
        checking={profile.isFetching}
        onRecheck={() => void profile.refetch()}
      />
    )
  }
  return <Outlet />
}

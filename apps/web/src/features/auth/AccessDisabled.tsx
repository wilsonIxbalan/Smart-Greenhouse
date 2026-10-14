import { LogOut, RefreshCw, ShieldOff } from 'lucide-react'
import { CenteredScreen } from '@/components/shared/CenteredScreen'
import { Button } from '@/components/ui/button'
import { useSignOut } from '@/features/auth/hooks'

interface AccessDisabledProps {
  email: string | null
  hasProfile: boolean
  checking: boolean
  onRecheck: () => void
}

export function AccessDisabled({ email, hasProfile, checking, onRecheck }: AccessDisabledProps) {
  const signOut = useSignOut()

  return (
    <CenteredScreen>
      <section
        aria-labelledby="access-title"
        className="flex flex-col items-center gap-3 rounded-xl border border-warning/50 bg-card p-6 text-center"
      >
        <ShieldOff aria-hidden className="size-8 text-warning" />
        <h1 id="access-title" className="text-lg font-semibold">
          Acceso desactivado
        </h1>
        <p className="text-sm break-words text-muted-foreground">
          {hasProfile
            ? 'Tu cuenta existe pero aún no está activa.'
            : 'Tu cuenta no tiene un perfil asignado.'}{' '}
          Pide al administrador que la active en Supabase.
        </p>
        {email && <p className="font-mono text-xs break-all text-muted-foreground">{email}</p>}
        <div className="mt-2 flex w-full flex-col gap-2">
          <Button className="min-h-11" variant="outline" onClick={onRecheck} disabled={checking}>
            <RefreshCw aria-hidden className={checking ? 'animate-spin' : undefined} />
            {checking ? 'Comprobando…' : 'Volver a comprobar'}
          </Button>
          <Button
            className="min-h-11"
            variant="ghost"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            <LogOut aria-hidden />
            Cerrar sesión
          </Button>
        </div>
      </section>
    </CenteredScreen>
  )
}

import { cn } from '@/lib/utils'
import { useOpenAlertCount } from './hooks'

/** Número de alertas abiertas; rojo si alguna es crítica. No se dibuja si no hay ninguna. */
export function OpenAlertsBadge({ className }: { className?: string }) {
  const { count, critical } = useOpenAlertCount()
  if (count === 0) return null
  return (
    <span
      aria-label={count === 1 ? '1 alerta abierta' : `${count} alertas abiertas`}
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-5 font-semibold tabular-nums',
        critical ? 'bg-critical text-background' : 'bg-warning text-background',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

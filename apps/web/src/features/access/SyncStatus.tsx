import { CircleCheck, RefreshCw, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ACCESS_SYNC_STALE_MS } from '@/config/access'
import { formatAge } from '@/lib/sensors'
import type { AccessSync } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type View = { tone: 'ok' | 'warning' | 'neutral'; title: string; detail: string }

function view(sync: AccessSync | null, now: number): View {
  if (!sync || sync.checkedAt === null)
    return {
      tone: 'neutral',
      title: 'El ESP32 aún no ha consultado la lista',
      detail:
        'Mientras tanto el Mega usa la lista que tenga guardada (de fábrica: las 4 del equipo).',
    }
  const age = now - sync.checkedAt
  if (age > ACCESS_SYNC_STALE_MS)
    return {
      tone: 'warning',
      title: `Sin noticias del ESP32 ${formatAge(age)}`,
      detail:
        'La puerta sigue funcionando con la última lista que recibió el Mega. Los cambios se aplicarán cuando vuelva la conexión.',
    }
  if (sync.megaVersion === sync.cardsVersion)
    return {
      tone: 'ok',
      title: 'El Mega tiene la lista al día',
      detail: `Versión ${sync.cardsVersion} · revisado ${formatAge(age)}.`,
    }
  return {
    tone: 'warning',
    title: 'Enviando la lista nueva al Mega…',
    detail: `El Mega tiene la versión ${sync.megaVersion ?? '—'} y la nube la ${sync.cardsVersion}. Se actualiza en menos de 30 s.`,
  }
}

export function SyncStatus({ sync, now }: { sync: AccessSync | null; now: number }) {
  const v = view(sync, now)
  const Icon = v.tone === 'ok' ? CircleCheck : v.tone === 'warning' ? TriangleAlert : RefreshCw
  return (
    <Card
      role="status"
      className={cn(
        'flex-row items-start gap-3 border-l-4 p-4',
        v.tone === 'ok'
          ? 'border-l-primary'
          : v.tone === 'warning'
            ? 'border-l-warning'
            : 'border-l-border',
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'mt-0.5 size-5 shrink-0',
          v.tone === 'ok'
            ? 'text-primary'
            : v.tone === 'warning'
              ? 'text-warning'
              : 'text-muted-foreground',
        )}
      />
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-semibold">{v.title}</p>
        <p className="text-sm text-muted-foreground">{v.detail}</p>
      </div>
    </Card>
  )
}

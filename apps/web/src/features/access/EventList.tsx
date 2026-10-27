import { DoorOpen, ShieldX, UserPlus } from 'lucide-react'
import { StatusChip } from '@/components/shared/StatusChip'
import { Button } from '@/components/ui/button'
import { formatUid } from '@/config/access'
import { formatAge } from '@/lib/sensors'
import type { AccessCard, AccessEvent } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const clock = new Intl.DateTimeFormat('es-GT', { dateStyle: 'short', timeStyle: 'short' })

/** Por qué se negó: desconocida, desactivada o el Mega aún no tenía la lista nueva. */
function deniedReason(e: AccessEvent, card: AccessCard | undefined): string {
  if (e.cardId === null || !card) return 'Tarjeta no registrada'
  if (!card.active) return 'Tarjeta desactivada'
  return 'El Mega aún no tenía esta tarjeta en su lista'
}

interface EventListProps {
  events: AccessEvent[]
  cards: Map<number, AccessCard>
  now: number
  canManage: boolean
  onRegister: (uid: string) => void
}

export function EventList({ events, cards, now, canManage, onRegister }: EventListProps) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {events.map((e) => {
        const card = e.cardId !== null ? cards.get(e.cardId) : undefined
        const unknown = e.cardId === null
        return (
          <li key={e.id} className="flex items-start gap-3 px-4 py-3">
            {e.granted ? (
              <DoorOpen aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            ) : (
              <ShieldX aria-hidden className="mt-0.5 size-5 shrink-0 text-critical" />
            )}
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn('text-sm font-medium', unknown && 'text-muted-foreground')}>
                  {e.holder ?? 'Tarjeta desconocida'}
                </span>
                <StatusChip
                  tone={e.granted ? 'ok' : 'critical'}
                  label={e.granted ? 'Entró' : 'Denegado'}
                />
              </div>
              <p className="font-mono text-xs break-all text-muted-foreground">
                {formatUid(e.uid)}
              </p>
              <p className="text-xs text-muted-foreground">
                {clock.format(e.receivedAt)} · {formatAge(now - e.receivedAt)}
                {!e.granted && ` · ${deniedReason(e, card)}`}
              </p>
            </div>
            {canManage && unknown && (
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 shrink-0"
                onClick={() => onRegister(e.uid)}
              >
                <UserPlus aria-hidden />
                Registrar
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

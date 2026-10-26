import { KeyRound, ScanLine } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { ACCESS_EVENTS_LIMIT, MAX_ACTIVE_CARDS } from '@/config/access'
import { usePermissions, useProfile } from '@/features/auth/hooks'
import { useNow } from '@/lib/use-now'
import { AddCardForm } from './AddCardForm'
import { CardList } from './CardList'
import { EventList } from './EventList'
import {
  useAccessCards,
  useAccessEvents,
  useAccessSync,
  useAddCard,
  useDeleteCard,
  useLiveAccess,
  useSetCardActive,
} from './hooks'
import { SyncStatus } from './SyncStatus'

export function AccessPage() {
  const profile = useProfile()
  const { can } = usePermissions()
  const allowed = can('access.view')
  const canManage = can('access.manage')
  const now = useNow()

  const cards = useAccessCards(allowed)
  const events = useAccessEvents(allowed)
  const sync = useAccessSync(allowed)
  useLiveAccess(allowed)

  const add = useAddCard()
  const toggle = useSetCardActive()
  const remove = useDeleteCard()
  const [prefill, setPrefill] = useState<{ uid: string; seq: number } | null>(null)

  const cardById = useMemo(() => new Map((cards.data ?? []).map((c) => [c.id, c])), [cards.data])
  const activeCount = (cards.data ?? []).filter((c) => c.active).length
  const busyId = toggle.isPending
    ? toggle.variables.id
    : remove.isPending
      ? (remove.variables ?? null)
      : null

  if (profile.isPending) return <Skeleton className="h-40 rounded-xl" />
  if (!allowed) return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold lg:text-2xl">Accesos</h1>
        <p className="text-sm text-muted-foreground">
          La puerta se abre con tarjeta RFID. El Mega decide con la lista que guarda en su memoria,
          así que funciona aunque no haya internet; cada intento queda registrado aquí.
          {!canManage && ' Solo el administrador puede agregar o quitar tarjetas.'}
        </p>
      </div>

      {sync.isError ? null : sync.isPending ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : (
        <SyncStatus sync={sync.data} now={now} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="min-w-0 space-y-3">
          <SectionHeader
            title="Entradas"
            description={`Últimos ${ACCESS_EVENTS_LIMIT} intentos en el lector, al instante.`}
          />
          {events.isPending ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : events.isError ? (
            <ErrorState
              title="No se pudieron cargar las entradas"
              description={events.error.message}
              onRetry={() => void events.refetch()}
            />
          ) : events.data.length === 0 ? (
            <EmptyState
              icon={ScanLine}
              title="Sin entradas todavía"
              description="Pasa una tarjeta por el lector: el intento aparece aquí en segundos."
            />
          ) : (
            <EventList
              events={events.data}
              cards={cardById}
              now={now}
              canManage={canManage}
              onRegister={(uid) => setPrefill({ uid, seq: Date.now() })}
            />
          )}
        </section>

        <section className="min-w-0 space-y-3">
          <SectionHeader
            title="Tarjetas"
            description={`${activeCount} de ${MAX_ACTIVE_CARDS} activas (lo que cabe en el Mega).`}
          />
          {cards.isPending ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : cards.isError ? (
            <ErrorState
              title="No se pudieron cargar las tarjetas"
              description={cards.error.message}
              onRetry={() => void cards.refetch()}
            />
          ) : cards.data.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="Sin tarjetas registradas"
              description="Sin tarjetas activas nadie puede abrir la puerta con el lector."
            />
          ) : (
            <CardList
              cards={cards.data}
              canManage={canManage}
              busyId={busyId}
              onToggle={(c, active) => toggle.mutate({ id: c.id, active })}
              onDelete={(c) => remove.mutate(c.id)}
            />
          )}
          {canManage && (
            <AddCardForm
              prefill={prefill}
              pending={add.isPending}
              onAdd={(uid, holder, done) => add.mutate({ uid, holder }, { onSuccess: done })}
            />
          )}
        </section>
      </div>
    </div>
  )
}

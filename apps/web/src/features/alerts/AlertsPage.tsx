import { BellOff } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ALERT_HISTORY_DAYS } from '@/config/alerts'
import { usePermissions } from '@/features/auth/hooks'
import { useNow } from '@/lib/use-now'
import { AlertItem } from './AlertItem'
import { isOpen, useAcknowledgeAlert, useAlerts } from './hooks'

const FILTERS = [
  { key: 'open', label: 'Abiertas' },
  { key: 'all', label: `Últimos ${ALERT_HISTORY_DAYS} días` },
] as const
type Filter = (typeof FILTERS)[number]['key']

export function AlertsPage() {
  const alerts = useAlerts()
  const ack = useAcknowledgeAlert()
  const { can } = usePermissions()
  const now = useNow()
  const [filter, setFilter] = useState<Filter>('open')

  const all = alerts.data ?? []
  const shown = filter === 'open' ? all.filter(isOpen) : all
  const openCount = all.filter(isOpen).length

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold lg:text-2xl">Alertas</h1>
        <p className="text-sm text-muted-foreground">
          La nube las abre y las cierra sola con cada lectura. Las críticas (gas o CO) también
          llegan al grupo de Telegram. Reconocer solo indica que alguien ya la vio.
        </p>
      </div>

      <div role="radiogroup" aria-label="Filtro de alertas" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            role="radio"
            aria-checked={filter === f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            className="min-h-11"
            onClick={() => setFilter(f.key)}
          >
            {f.key === 'open' ? `${f.label} (${openCount})` : f.label}
          </Button>
        ))}
      </div>

      {alerts.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : alerts.isError ? (
        <ErrorState
          title="No se pudieron cargar las alertas"
          description={alerts.error.message}
          onRetry={() => void alerts.refetch()}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={filter === 'open' ? 'Sin alertas abiertas' : 'Sin alertas en estos días'}
          description="Cuando una lectura cruce un umbral, la alerta aparecerá aquí sola."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {shown.map((a) => (
            <li key={a.id} className="min-w-0">
              <AlertItem
                alert={a}
                now={now}
                canAck={can('alerts.ack')}
                acking={ack.isPending && ack.variables === a.id}
                onAck={() => ack.mutate(a.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

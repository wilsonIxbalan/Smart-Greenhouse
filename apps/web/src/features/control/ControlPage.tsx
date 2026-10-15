import { RotateCcw, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ACTUATORS_UI, type ActuatorDef } from '@/config/actuators'
import { DEFAULT_TTL, TTL_OPTIONS } from '@/config/commands'
import { usePermissions } from '@/features/auth/hooks'
import { useDeviceStatus, useLatestReading } from '@/features/dashboard/hooks'
import { NoReadingsState } from '@/features/dashboard/NoReadingsState'
import { isStale, latestTimestamp } from '@/lib/sensors'
import type { CommandRequest } from '@/lib/supabase/types'
import { useNow } from '@/lib/use-now'
import { ActuatorControlCard } from './ActuatorControlCard'
import { CommandStatusLine } from './CommandStatusLine'
import { isFeedbackVisible, lastCommandFor, lastGlobalCommand } from './command-view'
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog'
import { isInFlight, useCommands, useIssueCommand } from './hooks'

export function ControlPage() {
  const latest = useLatestReading()
  const device = useDeviceStatus()
  const commands = useCommands()
  const issue = useIssueCommand()
  const { can } = usePermissions()
  const now = useNow()
  const [ttlS, setTtlS] = useState<number>(DEFAULT_TTL)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  if (latest.isPending) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ACTUATORS_UI.map(({ key }) => (
          <Skeleton key={key} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }
  if (latest.isError) {
    return (
      <ErrorState
        title="No se pudo cargar el estado de los actuadores"
        description={latest.error.message}
        onRetry={() => void latest.refetch()}
      />
    )
  }

  const reading = latest.data
  const canControl = can('actuators.control')
  const list = commands.data ?? []
  const online = !isStale(latestTimestamp(reading?.receivedAt, device.data?.lastSeenAt), now)
  const global = lastGlobalCommand(list)
  const globalBusy =
    (global !== null && isInFlight(global)) ||
    (issue.isPending && issue.variables.actuator === null)

  const send = (req: CommandRequest, confirmation?: { title: string; message: string }) => {
    if (confirmation) setConfirm({ ...confirmation, onConfirm: () => issue.mutate(req) })
    else issue.mutate(req)
  }

  const sendValue = (def: ActuatorDef, value: number) => {
    const req: CommandRequest = { kind: def.control.kind, actuator: def.key, value, ttlS }
    const message = def.confirm?.(value)
    const ttlLabel = `Quedará en modo manual ${Math.round(ttlS / 60)} min y luego vuelve a automático.`
    send(
      req,
      message
        ? { title: `${def.label}: ${def.format(value)}`, message: `${message} ${ttlLabel}` }
        : undefined,
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold lg:text-2xl">Control</h1>
        <p className="text-sm text-muted-foreground">
          La web envía la orden; el Mega la ejecuta y confirma. Los interlocks (sin agua, CO alto)
          ganan a cualquier comando.
        </p>
      </div>

      {!online && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning/40 p-3 text-sm text-muted-foreground"
        >
          <WifiOff aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          El dispositivo no está en línea. Puedes enviar el comando, pero expirará si no lo toma en
          30 s.
        </p>
      )}

      {canControl && (
        <Card className="gap-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p id="ttl-label" className="text-sm font-medium">
                Duración del modo manual
              </p>
              <div role="radiogroup" aria-labelledby="ttl-label" className="flex flex-wrap gap-2">
                {TTL_OPTIONS.map((o) => (
                  <Button
                    key={o.seconds}
                    role="radio"
                    aria-checked={ttlS === o.seconds}
                    variant={ttlS === o.seconds ? 'default' : 'outline'}
                    size="sm"
                    className="min-h-11 min-w-16"
                    onClick={() => setTtlS(o.seconds)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={globalBusy}
              onClick={() => send({ kind: 'auto', actuator: null, value: null, ttlS: null })}
            >
              <RotateCcw aria-hidden />
              Todo a automático
            </Button>
          </div>
          {global && isFeedbackVisible(global, reading, now) && (
            <CommandStatusLine command={global} />
          )}
        </Card>
      )}

      {!reading ? (
        <NoReadingsState />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ACTUATORS_UI.map((def) => {
            const last = lastCommandFor(list, def.key)
            const sending = issue.isPending && issue.variables.actuator === def.key
            const busy = globalBusy || sending || (last !== null && isInFlight(last))
            return (
              <li key={def.key} className="min-w-0">
                <ActuatorControlCard
                  def={def}
                  reading={reading}
                  now={now}
                  command={last && isFeedbackVisible(last, reading, now) ? last : null}
                  busy={busy}
                  canControl={canControl}
                  onSend={(value) => sendValue(def, value)}
                  onAuto={() => send({ kind: 'auto', actuator: def.key, value: null, ttlS: null })}
                />
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}

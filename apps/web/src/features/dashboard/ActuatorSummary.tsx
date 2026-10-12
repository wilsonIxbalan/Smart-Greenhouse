import type { Telemetry } from '@inv/contracts'
import { StatusChip } from '@/components/shared/StatusChip'
import { Card } from '@/components/ui/card'
import { ACTUATORS_UI } from '@/config/actuators'
import { cn } from '@/lib/utils'

const formatTtl = (s: number) => (s >= 60 ? `${Math.ceil(s / 60)} min` : `${s} s`)

/** Estado confirmado por telemetría (solo lectura). El control con comandos llega en B9. */
export function ActuatorSummary({ frame }: { frame: Telemetry }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
      {ACTUATORS_UI.map(({ key, label, icon: Icon, describe, isActive }) => {
        const ttl = frame.man[key]
        const active = isActive(frame)
        return (
          <li key={key}>
            <Card className="h-full flex-row items-center gap-3 px-4 py-3">
              <Icon
                aria-hidden
                className={cn('size-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{describe(frame)}</p>
              </div>
              {ttl !== undefined ? (
                <StatusChip
                  className="shrink-0"
                  tone="warning"
                  label={`Manual · ${formatTtl(ttl)}`}
                />
              ) : (
                <StatusChip className="shrink-0" tone="neutral" label="Auto" />
              )}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

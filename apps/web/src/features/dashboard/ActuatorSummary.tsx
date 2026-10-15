import { StatusChip } from '@/components/shared/StatusChip'
import { Card } from '@/components/ui/card'
import { ACTUATORS_UI } from '@/config/actuators'
import { formatCountdown, manualRemainingS } from '@/lib/manual-mode'
import type { Reading } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

/** Estado confirmado por telemetría (solo lectura); el control está en /control. */
export function ActuatorSummary({ reading, now }: { reading: Reading; now: number }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
      {ACTUATORS_UI.map((def) => {
        const { key, label, icon: Icon } = def
        const value = def.value(reading.frame)
        const remaining = manualRemainingS(reading, key, now)
        return (
          <li key={key}>
            <Card className="h-full flex-row items-center gap-3 px-4 py-3">
              <Icon
                aria-hidden
                className={cn(
                  'size-5 shrink-0',
                  value > 0 ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{def.format(value)}</p>
              </div>
              {remaining === null ? (
                <StatusChip className="shrink-0" tone="neutral" label="Auto" />
              ) : (
                <StatusChip
                  className="shrink-0 tabular-nums"
                  tone="warning"
                  label={
                    remaining > 0 ? `Manual · ${formatCountdown(remaining)}` : 'Volviendo a auto'
                  }
                />
              )}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

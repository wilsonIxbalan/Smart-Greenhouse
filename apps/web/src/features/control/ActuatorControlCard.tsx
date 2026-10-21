import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { StatusChip } from '@/components/shared/StatusChip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import type { ActuatorDef } from '@/config/actuators'
import { formatCountdown, manualRemainingS } from '@/lib/manual-mode'
import type { CommandRow, Reading } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { CommandStatusLine } from './CommandStatusLine'

interface ActuatorControlCardProps {
  def: ActuatorDef
  reading: Reading
  now: number
  /** Último comando propio, ya filtrado por visibilidad. */
  command: CommandRow | null
  /** Hay un comando en curso (propio o global): sin doble envío. */
  busy: boolean
  canControl: boolean
  onSend: (value: number) => void
  onAuto: () => void
}

/** Estado confirmado por la trama + controles según `def.control` (switch, nivel o ángulo). */
export function ActuatorControlCard({
  def,
  reading,
  now,
  command,
  busy,
  canControl,
  onSend,
  onAuto,
}: ActuatorControlCardProps) {
  const { icon: Icon, control } = def
  const current = def.value(reading.frame)
  const remaining = manualRemainingS(reading, def.key, now)
  const [draft, setDraft] = useState<number | null>(null)
  const level = draft ?? current

  return (
    <Card className="h-full gap-4 p-4">
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden
          className={cn(
            'mt-0.5 size-5 shrink-0',
            current > 0 ? 'text-primary' : 'text-muted-foreground',
          )}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{def.label}</h2>
          <p className="text-sm text-muted-foreground">{def.format(current)}</p>
        </div>
        {remaining === null ? (
          <StatusChip className="shrink-0" tone="neutral" label="Auto" />
        ) : (
          <StatusChip
            className="shrink-0 tabular-nums"
            tone="warning"
            label={remaining > 0 ? `Manual · ${formatCountdown(remaining)}` : 'Volviendo a auto'}
          />
        )}
      </div>

      {canControl && (
        <div className="space-y-3">
          {control.kind === 'switch' && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="min-h-11"
                disabled={busy}
                onClick={() => onSend(1)}
              >
                Encender
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={busy}
                onClick={() => onSend(0)}
              >
                Apagar
              </Button>
            </div>
          )}

          {control.kind === 'level' && (
            <div className="flex items-center gap-3">
              <Slider
                aria-label={`${def.label} (%)`}
                min={control.min}
                max={control.max}
                step={control.step}
                value={[level]}
                disabled={busy}
                onValueChange={([v]) => setDraft(v ?? null)}
                className="min-h-11 flex-1"
              />
              <span className="w-12 text-right text-sm tabular-nums">{level} %</span>
              <Button
                className="min-h-11"
                disabled={busy || draft === null}
                onClick={() => {
                  onSend(level)
                  setDraft(null)
                }}
              >
                Aplicar
              </Button>
            </div>
          )}

          {control.kind === 'angle' && (
            <div className="grid grid-cols-3 gap-2">
              {control.presets.map((deg) => (
                <Button
                  key={deg}
                  variant={deg === current ? 'secondary' : 'outline'}
                  className="min-h-11 tabular-nums"
                  disabled={busy}
                  onClick={() => onSend(deg)}
                >
                  {deg}°
                </Button>
              ))}
            </div>
          )}

          {remaining !== null && (
            <Button variant="ghost" className="min-h-11 w-full" disabled={busy} onClick={onAuto}>
              <RotateCcw aria-hidden />
              Volver a automático
            </Button>
          )}
        </div>
      )}

      {command && <CommandStatusLine command={command} def={def} />}
    </Card>
  )
}

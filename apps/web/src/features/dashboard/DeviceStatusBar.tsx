import { Wifi, WifiOff } from 'lucide-react'
import { StatusChip } from '@/components/shared/StatusChip'
import { DEVICE_ID } from '@/config/device'
import { formatAge } from '@/lib/sensors'

interface DeviceStatusBarProps {
  online: boolean
  lastSeenAt: number | null
  now: number
  openAlerts?: number
}

export function DeviceStatusBar({ online, lastSeenAt, now, openAlerts }: DeviceStatusBarProps) {
  const age = lastSeenAt === null ? null : formatAge(now - lastSeenAt)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {online ? (
          <Wifi aria-hidden className="size-4 text-primary" />
        ) : (
          <WifiOff aria-hidden className="size-4 text-critical" />
        )}
        <StatusChip
          tone={online ? 'ok' : 'critical'}
          label={online ? 'En línea' : 'Sin conexión'}
        />
        <span className="text-muted-foreground">
          {age ? `Última trama ${age}` : 'Sin tramas registradas'}
        </span>
        {openAlerts !== undefined && openAlerts > 0 && (
          <StatusChip
            tone="warning"
            label={openAlerts === 1 ? '1 alerta abierta' : `${openAlerts} alertas abiertas`}
          />
        )}
      </div>
      {!online && age && (
        <p role="status" className="text-sm break-words text-muted-foreground">
          El dispositivo <span className="font-mono">{DEVICE_ID}</span> no envía datos desde {age}.
          Revisa la alimentación y el WiFi del ESP32, o que el simulador esté corriendo. Los valores
          de abajo son los últimos recibidos.
        </p>
      )}
    </div>
  )
}

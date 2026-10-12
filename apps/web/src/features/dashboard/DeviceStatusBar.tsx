import { Wifi, WifiOff } from 'lucide-react'
import { StatusChip } from '@/components/shared/StatusChip'
import { formatAge } from '@/lib/sensors'

interface DeviceStatusBarProps {
  online: boolean
  lastSeenAt: number | null
  now: number
  demoLabel?: string
}

export function DeviceStatusBar({ online, lastSeenAt, now, demoLabel }: DeviceStatusBarProps) {
  const age = lastSeenAt === null ? 'sin datos' : formatAge(now - lastSeenAt)
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {online ? (
        <Wifi aria-hidden className="size-4 text-primary" />
      ) : (
        <WifiOff aria-hidden className="size-4 text-critical" />
      )}
      <StatusChip tone={online ? 'ok' : 'critical'} label={online ? 'En línea' : 'Sin conexión'} />
      <span className="text-muted-foreground">Última trama {age}</span>
      {demoLabel && <StatusChip tone="neutral" label={demoLabel} className="ml-auto" />}
    </div>
  )
}

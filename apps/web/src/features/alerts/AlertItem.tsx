import { Check } from 'lucide-react'
import { StatusChip } from '@/components/shared/StatusChip'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ALERT_TYPES_UI, SEVERITY_UI } from '@/config/alerts'
import { formatAge, formatDuration } from '@/lib/sensors'
import type { AlertRow } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const clock = new Intl.DateTimeFormat('es-GT', { dateStyle: 'short', timeStyle: 'short' })

interface AlertItemProps {
  alert: AlertRow
  now: number
  canAck: boolean
  acking: boolean
  onAck: () => void
}

export function AlertItem({ alert, now, canAck, acking, onAck }: AlertItemProps) {
  const { title, icon: Icon } = ALERT_TYPES_UI[alert.type]
  const severity = SEVERITY_UI[alert.severity]
  const open = alert.resolvedAt === null
  const critical = alert.severity === 'critical'

  return (
    <Card
      className={cn(
        'gap-3 border-l-4 p-4',
        !open ? 'border-l-border' : critical ? 'border-l-critical' : 'border-l-warning',
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden
          className={cn(
            'mt-0.5 size-5 shrink-0',
            !open ? 'text-muted-foreground' : critical ? 'text-critical' : 'text-warning',
          )}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-semibold">{title}</h2>
            <StatusChip tone={open ? severity.tone : 'neutral'} label={severity.label} />
          </div>
          <p className="text-sm break-words text-muted-foreground">{alert.message}</p>
          <p className="text-xs text-muted-foreground">
            {open
              ? `Abierta ${formatAge(now - alert.createdAt)} · ${clock.format(alert.createdAt)}`
              : `Resuelta · duró ${formatDuration((alert.resolvedAt ?? now) - alert.createdAt)} · ${clock.format(alert.createdAt)}`}
          </p>
          {alert.acknowledgedAt !== null && (
            <p className="flex items-center gap-1 text-xs text-primary">
              <Check aria-hidden className="size-3.5" />
              Reconocida {formatAge(now - alert.acknowledgedAt)}
            </p>
          )}
        </div>
      </div>
      {open && alert.acknowledgedAt === null && canAck && (
        <Button variant="outline" className="min-h-11 self-start" disabled={acking} onClick={onAck}>
          <Check aria-hidden />
          Reconocer
        </Button>
      )}
    </Card>
  )
}

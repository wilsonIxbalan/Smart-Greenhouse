import { CircleSlash, Clock, TriangleAlert } from 'lucide-react'
import { InfoElectronicaChip } from '@/components/shared/InfoElectronicaChip'
import { StatusChip, type StatusTone } from '@/components/shared/StatusChip'
import { Card } from '@/components/ui/card'
import type { MetricAvailability, MetricDetail, MetricTone } from '@/config/metrics'
import { cn } from '@/lib/utils'

const toneBar: Record<MetricTone, string> = {
  primary: 'bg-primary',
  water: 'bg-water',
  copper: 'bg-copper',
  warning: 'bg-warning',
  critical: 'bg-critical',
}

const UNAVAILABLE_LABEL: Record<Exclude<MetricAvailability, 'ok'>, string> = {
  'no-reading': 'Sin lectura',
  'no-sensor': 'Sin sensor',
}

export interface MetricCardProps {
  label: string
  unit: string
  tone: MetricTone
  value: string | null
  availability: MetricAvailability
  stale?: boolean
  ageLabel?: string
  alert?: boolean
  secondary?: string
  details?: MetricDetail[]
  badge?: { tone: StatusTone; label: string }
  note?: string
  onInfo?: () => void
}

export function MetricCard(props: MetricCardProps) {
  const { label, unit, tone, value, availability, stale, ageLabel, alert } = props
  const unavailable = availability !== 'ok' || value === null

  return (
    <Card
      data-state={unavailable ? availability : stale ? 'stale' : 'ok'}
      className={cn(
        'relative gap-3 overflow-hidden px-4 py-4',
        alert && 'border-critical/60',
        stale && 'opacity-60',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', toneBar[tone])} />
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        {props.badge && <StatusChip tone={props.badge.tone} label={props.badge.label} />}
      </div>

      {availability !== 'ok' || value === null ? (
        <p className="flex items-center gap-2 text-lg font-medium text-muted-foreground">
          <CircleSlash aria-hidden className="size-5" />
          {availability === 'ok'
            ? UNAVAILABLE_LABEL['no-reading']
            : UNAVAILABLE_LABEL[availability]}
        </p>
      ) : (
        <p className="flex items-baseline gap-1.5">
          <span className={cn('font-mono text-3xl font-semibold', alert && 'text-critical')}>
            {value}
          </span>
          <span className="text-sm text-muted-foreground">{unit}</span>
          {alert && (
            <span className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-critical">
              <TriangleAlert aria-hidden className="size-3.5" />
              Fuera de umbral
            </span>
          )}
        </p>
      )}

      {!unavailable && props.secondary && (
        <p className="text-xs text-muted-foreground">{props.secondary}</p>
      )}
      {!unavailable && props.details && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
          {props.details.map((d) => (
            <div key={d.label} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {props.note && <p className="text-xs text-muted-foreground italic">{props.note}</p>}

      <div className="flex items-center justify-between gap-2">
        {stale && ageLabel ? (
          <span className="inline-flex items-center gap-1 text-xs text-warning">
            <Clock aria-hidden className="size-3.5" />
            Dato viejo · {ageLabel}
          </span>
        ) : (
          <span />
        )}
        {props.onInfo && <InfoElectronicaChip onClick={props.onInfo} label={label} />}
      </div>
    </Card>
  )
}

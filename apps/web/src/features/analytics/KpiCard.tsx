import { Card } from '@/components/ui/card'
import type { MetricTone } from '@/config/metrics'
import { cn } from '@/lib/utils'

const toneBar: Record<MetricTone, string> = {
  primary: 'bg-primary',
  water: 'bg-water',
  copper: 'bg-copper',
  warning: 'bg-warning',
  critical: 'bg-critical',
}

interface KpiCardProps {
  label: string
  value: string
  unit?: string
  tone: MetricTone
  detail?: string
  /** Texto en rojo (p. ej. horas fuera de umbral). */
  warning?: string
}

export function KpiCard({ label, value, unit, tone, detail, warning }: KpiCardProps) {
  return (
    <Card className="relative gap-1 overflow-hidden px-4 py-3">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', toneBar[tone])} />
      <h3 className="text-xs font-medium text-muted-foreground">{label}</h3>
      <p className="text-2xl font-semibold tabular-nums">
        {value}
        {unit && value !== '—' && (
          <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
        )}
      </p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      {warning && <p className="text-xs font-medium text-critical">{warning}</p>}
    </Card>
  )
}

import type { Telemetry } from '@inv/contracts'
import type { MetricAvailability, MetricDef, MetricDetail } from '@/config/metrics'
import type { StatusTone } from '@/components/shared/StatusChip'

export interface MetricView {
  value: string | null
  availability: MetricAvailability
  alert: boolean
  secondary?: string
  details?: MetricDetail[]
  badge?: { tone: StatusTone; label: string }
}

/** Traduce una definición de config + trama a lo que pinta la tarjeta. */
export function evaluateMetric(def: MetricDef, frame: Telemetry): MetricView {
  const raw = def.select(frame)
  const availability = def.availability?.(frame) ?? (raw === null ? 'no-reading' : 'ok')
  const ok = availability === 'ok' && raw !== null
  const view: MetricView = {
    value: ok ? raw.toFixed(def.decimals) : null,
    availability: ok ? 'ok' : availability === 'ok' ? 'no-reading' : availability,
    alert: ok && (def.alert?.(frame) ?? false),
  }
  if (ok && def.secondary) view.secondary = def.secondary(frame)
  if (ok && def.details) view.details = def.details(frame)
  if (def.badge) view.badge = def.badge(frame)
  return view
}

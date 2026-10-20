import { ANALYTICS_SERIES, FRAME_INTERVAL_S, type AnalyticsSeries } from '@/config/analytics'
import type { AlertRow, AlertType, HourlyColumn, HourlyPoint } from '@/lib/supabase/types'

export const HOUR_MS = 3_600_000

export interface SeriesStats {
  avg: number | null
  min: number | null
  max: number | null
  /** Horas con algún valor del lado malo del umbral. */
  breachHours: number
}

export interface Coverage {
  received: number
  expected: number
  ratio: number
}

export interface Summary {
  series: { def: AnalyticsSeries; stats: SeriesStats }[]
  /** Fracción del tiempo con la bomba encendida (0…1). */
  pumpRatio: number | null
  coverage: Coverage | null
  hoursWithData: number
  alerts: { total: number; critical: number; byType: { type: AlertType; count: number }[] }
}

/** Inicio del periodo: la hora en curso y las `hours - 1` anteriores completas. */
export const rangeStart = (hours: number, nowMs: number) =>
  Math.floor(nowMs / HOUR_MS) * HOUR_MS - (hours - 1) * HOUR_MS

/** Promedio ponderado por tramas: una hora con pocas tramas no pesa igual que una completa. */
export function weightedAvg(points: readonly HourlyPoint[], column: HourlyColumn): number | null {
  let sum = 0
  let weight = 0
  for (const p of points) {
    const v = p[column]
    if (v === null) continue
    sum += v * p.samples
    weight += p.samples
  }
  return weight > 0 ? sum / weight : null
}

function extreme(points: readonly HourlyPoint[], column: HourlyColumn, pick: 'min' | 'max') {
  const values = points.map((p) => p[column]).filter((v): v is number => v !== null)
  if (values.length === 0) return null
  return pick === 'min' ? Math.min(...values) : Math.max(...values)
}

export function seriesStats(points: readonly HourlyPoint[], s: AnalyticsSeries): SeriesStats {
  const limit = s.threshold?.value
  let breachHours = 0
  if (limit !== undefined && s.breach) {
    const column = s.breach === 'above' ? (s.max ?? s.avg) : (s.min ?? s.avg)
    breachHours = points.filter((p) => {
      const v = p[column]
      return v !== null && (s.breach === 'above' ? v > limit : v < limit)
    }).length
  }
  return {
    avg: weightedAvg(points, s.avg),
    min: extreme(points, s.min ?? s.avg, 'min'),
    max: extreme(points, s.max ?? s.avg, 'max'),
    breachHours,
  }
}

/**
 * Tramas recibidas ÷ esperadas, solo en horas completas desde la primera con datos (la hora en curso
 * todavía se está agregando). Las horas sin ninguna trama cuentan como esperadas.
 */
export function frameCoverage(points: readonly HourlyPoint[], nowMs: number): Coverage | null {
  const currentHour = Math.floor(nowMs / HOUR_MS) * HOUR_MS
  const complete = points.filter((p) => p.t + HOUR_MS <= currentHour)
  const first = complete[0]
  if (!first) return null
  const expected = ((currentHour - first.t) / HOUR_MS) * (3600 / FRAME_INTERVAL_S)
  const received = complete.reduce((n, p) => n + p.samples, 0)
  return { received, expected, ratio: Math.min(1, received / expected) }
}

export function summarize(
  points: readonly HourlyPoint[],
  alerts: readonly AlertRow[],
  nowMs: number,
): Summary {
  const counts = new Map<AlertType, number>()
  for (const a of alerts) counts.set(a.type, (counts.get(a.type) ?? 0) + 1)
  return {
    series: ANALYTICS_SERIES.map((def) => ({ def, stats: seriesStats(points, def) })),
    pumpRatio: weightedAvg(points, 'bomba_on_ratio'),
    coverage: frameCoverage(points, nowMs),
    hoursWithData: points.filter((p) => p.samples > 0).length,
    alerts: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      byType: [...counts]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    },
  }
}

const numberFmt = new Map<number, Intl.NumberFormat>()

/** Número con los decimales de la métrica ("—" si no hay dato). */
export function formatValue(value: number | null, decimals: number): string {
  if (value === null) return '—'
  let fmt = numberFmt.get(decimals)
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-GT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    numberFmt.set(decimals, fmt)
  }
  return fmt.format(value)
}

export const formatPercent = (ratio: number | null) =>
  ratio === null ? '—' : `${formatValue(ratio * 100, 0)} %`

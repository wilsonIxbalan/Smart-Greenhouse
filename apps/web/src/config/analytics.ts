import { METRICS, type MetricDef, type MetricKey } from '@/config/metrics'
import type { HourlyColumn } from '@/lib/supabase/types'

export const RANGES = [
  { key: '24h', label: '24 h', title: 'Últimas 24 horas', hours: 24, tick: 'time' },
  { key: '7d', label: '7 días', title: 'Últimos 7 días', hours: 7 * 24, tick: 'day' },
  { key: '30d', label: '30 días', title: 'Últimos 30 días', hours: 30 * 24, tick: 'day' },
] as const
export type RangeDef = (typeof RANGES)[number]
export type RangeKey = RangeDef['key']

/** Una trama cada 10 s (Q-31): base de las tramas esperadas por hora. */
export const FRAME_INTERVAL_S = 10
/** La nube recalcula los agregados por hora cada 10 min (job de pg_cron). */
export const ANALYTICS_REFETCH_MS = 10 * 60_000
/** Tope de alertas que se leen por periodo. */
export const ANALYTICS_MAX_ALERTS = 500

interface SeriesConfig {
  metric: MetricKey
  label?: string
  avg: HourlyColumn
  min?: HourlyColumn
  max?: HourlyColumn
  /** Qué lado del umbral cuenta como "fuera" (horas con el mín./máx. del otro lado). */
  breach?: 'above' | 'below'
}

const SERIES: SeriesConfig[] = [
  { metric: 'airTemp', avg: 'aire_t_avg', min: 'aire_t_min', max: 'aire_t_max', breach: 'above' },
  { metric: 'airHumidity', avg: 'aire_h_avg', breach: 'above' },
  {
    metric: 'soilHumidity',
    avg: 'suelo_h_avg',
    min: 'suelo_h_min',
    max: 'suelo_h_max',
    breach: 'below',
  },
  { metric: 'light', avg: 'lux_avg' },
  { metric: 'mq135', avg: 'mq135_avg', max: 'mq135_max', breach: 'above' },
  { metric: 'mq7', avg: 'co_avg', max: 'co_max', breach: 'above' },
  { metric: 'soilPh', label: 'pH aprox. del suelo (sin calibrar)', avg: 'ph_avg' },
]

export type AnalyticsSeries = Omit<SeriesConfig, 'label'> &
  Pick<MetricDef, 'key' | 'label' | 'unit' | 'tone' | 'decimals' | 'threshold'>

/** Variables de la analítica: nombre, unidad, tono y umbral salen de `METRICS`. */
export const ANALYTICS_SERIES: readonly AnalyticsSeries[] = SERIES.flatMap(({ label, ...s }) => {
  const m = (METRICS as readonly MetricDef[]).find((x) => x.key === s.metric)
  if (!m) return []
  const { key, unit, tone, decimals, threshold } = m
  return [{ ...s, key, label: label ?? m.label, unit, tone, decimals, threshold }]
})

import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { ANALYTICS_SERIES, type AnalyticsSeries, type RangeDef } from '@/config/analytics'
import type { HourlyPoint } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { formatValue, HOUR_MS } from './kpis'

interface RangePoint {
  t: number
  avg: number | null
  band: [number, number] | null
}

const GAP_FACTOR = 1.5
const tickFmt = {
  time: new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit' }),
  day: new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'short' }),
}
const tooltipFmt = new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
const cssVar = (token: string) => `var(--${token})`

/** Punto a mitad de cada hora; null en las horas sin datos para cortar la línea. */
function toRangeSeries(points: readonly HourlyPoint[], s: AnalyticsSeries): RangePoint[] {
  const out: RangePoint[] = []
  let prevT: number | null = null
  for (const p of points) {
    if (prevT !== null && p.t - prevT > HOUR_MS * GAP_FACTOR) {
      out.push({ t: prevT + HOUR_MS * 1.5, avg: null, band: null })
    }
    const lo = s.min ? p[s.min] : null
    const hi = s.max ? p[s.max] : null
    const avg = p[s.avg]
    const band: [number, number] | null = s.min || s.max ? [lo ?? avg ?? 0, hi ?? avg ?? 0] : null
    out.push({ t: p.t + HOUR_MS / 2, avg, band: avg === null ? null : band })
    prevT = p.t
  }
  return out
}

interface RangeChartProps {
  points: readonly HourlyPoint[]
  range: RangeDef
}

export function RangeChart({ points, range }: RangeChartProps) {
  const [key, setKey] = useState<string>(ANALYTICS_SERIES[0]?.key ?? '')
  const def = ANALYTICS_SERIES.find((s) => s.key === key) ?? ANALYTICS_SERIES[0]
  const data = useMemo(() => (def ? toRangeSeries(points, def) : []), [points, def])
  if (!def) return null
  const threshold = def.threshold
  const hasBand = Boolean(def.min || def.max)
  const tick = tickFmt[range.tick]

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Variable de la gráfica"
        className="flex gap-1 overflow-x-auto pb-1"
      >
        {ANALYTICS_SERIES.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={s.key === def.key ? 'secondary' : 'ghost'}
            aria-pressed={s.key === def.key}
            onClick={() => setKey(s.key)}
            className={cn('min-h-11 shrink-0', s.key === def.key && 'text-primary')}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <div
        className="h-60 w-full lg:h-72"
        role="img"
        aria-label={`Gráfica de ${range.title.toLowerCase()}: ${def.label}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={cssVar('border')} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(t: number) => tick.format(t)}
              tick={{ fill: cssVar('muted-foreground'), fontSize: 11 }}
              stroke={cssVar('border')}
            />
            <YAxis
              width="auto"
              domain={['auto', 'auto']}
              tick={{ fill: cssVar('muted-foreground'), fontSize: 11 }}
              stroke={cssVar('border')}
            />
            <Tooltip
              labelFormatter={(t) => tooltipFmt.format(Number(t) - HOUR_MS / 2)}
              formatter={(v, name) => {
                const text = Array.isArray(v)
                  ? `${formatValue(Number(v[0]), def.decimals)} – ${formatValue(Number(v[1]), def.decimals)}`
                  : formatValue(Number(v), def.decimals)
                return [`${text} ${def.unit}`, name === 'band' ? 'Mín – máx' : 'Promedio']
              }}
              contentStyle={{
                background: cssVar('popover'),
                border: `1px solid ${cssVar('border')}`,
                color: cssVar('popover-foreground'),
              }}
            />
            {threshold && (
              <ReferenceLine
                y={threshold.value}
                stroke={cssVar('warning')}
                strokeDasharray="6 4"
                label={{
                  value: threshold.label,
                  fill: cssVar('warning'),
                  fontSize: 11,
                  position: 'insideTopRight',
                }}
              />
            )}
            {hasBand && (
              <Area
                dataKey="band"
                stroke="none"
                fill={cssVar(def.tone)}
                fillOpacity={0.18}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="avg"
              stroke={cssVar(def.tone)}
              strokeWidth={2}
              dot={data.length < 3}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Promedio por hora{hasBand ? ' · franja: mínimo y máximo de cada hora' : ''}
        {threshold
          ? ` · línea punteada: ${threshold.label.toLowerCase()} (${threshold.value})`
          : ''}
      </p>
    </div>
  )
}

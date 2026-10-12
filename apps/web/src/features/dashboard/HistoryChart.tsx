import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { METRICS } from '@/config/metrics'
import type { Reading } from '@/lib/data-source'
import { cn } from '@/lib/utils'

const CHART_METRICS = METRICS.filter((m) => 'chart' in m && m.chart)
const timeFmt = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit' })
const cssVar = (token: string) => `var(--${token})`

export function HistoryChart({ history }: { history: Reading[] }) {
  const [key, setKey] = useState<string>(CHART_METRICS[0]?.key ?? '')
  const def = CHART_METRICS.find((m) => m.key === key) ?? CHART_METRICS[0]
  const data = useMemo(
    () => (def ? history.map((r) => ({ t: r.receivedAt, v: def.select(r.frame) })) : []),
    [history, def],
  )
  if (!def) return null
  const threshold = 'threshold' in def ? def.threshold : undefined

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Variable de la gráfica"
        className="flex gap-1 overflow-x-auto pb-1"
      >
        {CHART_METRICS.map((m) => (
          <Button
            key={m.key}
            size="sm"
            variant={m.key === def.key ? 'secondary' : 'ghost'}
            aria-pressed={m.key === def.key}
            onClick={() => setKey(m.key)}
            className={cn('min-h-11 shrink-0', m.key === def.key && 'text-primary')}
          >
            {m.label}
          </Button>
        ))}
      </div>
      <div className="h-56 w-full lg:h-72" aria-label={`Gráfica de 24 h: ${def.label}`} role="img">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke={cssVar('border')} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(t: number) => timeFmt.format(t)}
              tick={{ fill: cssVar('muted-foreground'), fontSize: 11 }}
              stroke={cssVar('border')}
            />
            <YAxis
              tick={{ fill: cssVar('muted-foreground'), fontSize: 11 }}
              stroke={cssVar('border')}
            />
            <Tooltip
              labelFormatter={(t) => timeFmt.format(Number(t))}
              formatter={(v) => [`${String(v)} ${def.unit}`, def.label]}
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
            <Line
              type="monotone"
              dataKey="v"
              stroke={cssVar(def.tone)}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

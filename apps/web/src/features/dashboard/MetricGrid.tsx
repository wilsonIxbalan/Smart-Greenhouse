import type { Telemetry } from '@inv/contracts'
import { MetricCard } from '@/components/shared/MetricCard'
import { METRICS } from '@/config/metrics'
import type { InfoKey } from '@/content/electronics/types'
import { evaluateMetric } from '@/lib/metric-view'

interface MetricGridProps {
  frame: Telemetry
  stale: boolean
  ageLabel: string
  onInfo: (key: InfoKey) => void
}

export function MetricGrid({ frame, stale, ageLabel, onInfo }: MetricGridProps) {
  return (
    <div data-testid="metric-grid" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {METRICS.map((def) => {
        const view = evaluateMetric(def, frame)
        return (
          <MetricCard
            key={def.key}
            label={def.label}
            unit={def.unit}
            tone={def.tone}
            {...view}
            {...('note' in def ? { note: def.note } : {})}
            stale={stale}
            ageLabel={ageLabel}
            onInfo={() => onInfo(def.infoKey)}
          />
        )
      })}
    </div>
  )
}

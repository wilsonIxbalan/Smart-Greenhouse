import type { SoilAptitude, Telemetry } from '@inv/contracts'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { StatusChip, type StatusTone } from '@/components/shared/StatusChip'
import { SOIL_PH } from '@/config/thresholds'
import { soilVerdict } from '@/lib/sensors'
import { cn } from '@/lib/utils'

const ROWS: readonly {
  verdict: SoilAptitude
  condition: string
  tone: StatusTone
  label: string
}[] = [
  {
    verdict: 'SIN_LECTURA',
    condition: 'Sensor 7 en 1 sin respuesta',
    tone: 'neutral',
    label: 'Sin lectura',
  },
  {
    verdict: 'APTO',
    condition: `${SOIL_PH.apt.min.toFixed(1)} ≤ pH ≤ ${SOIL_PH.apt.max.toFixed(1)}`,
    tone: 'ok',
    label: 'Apto',
  },
  {
    verdict: 'REGULAR',
    condition: `${SOIL_PH.regular.min.toFixed(1)} ≤ pH ≤ ${SOIL_PH.regular.max.toFixed(1)} (fuera de apto)`,
    tone: 'warning',
    label: 'Regular',
  },
  { verdict: 'NO_APTO', condition: 'Cualquier otro pH', tone: 'critical', label: 'No apto' },
]

export function SoilTruthTable({ frame }: { frame: Telemetry | null }) {
  const live = frame ? soilVerdict(frame.suelo_ok ? frame.ph : null) : null
  return (
    <section aria-label="Veredicto de suelo" data-testid="section-soil" className="space-y-3">
      <SectionHeader
        title="Tabla de verdad: veredicto de suelo"
        description={
          frame?.suelo_ok && frame.ph !== undefined
            ? `Lectura viva: pH ${frame.ph.toFixed(1)}`
            : 'Fila resaltada: la lectura viva.'
        }
      />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th scope="col" className="p-3 font-medium">
                Condición (en orden)
              </th>
              <th scope="col" className="p-3 font-medium">
                Veredicto
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const isLive = r.verdict === live
              return (
                <tr
                  key={r.verdict}
                  data-testid={`soil-row-${r.verdict}`}
                  aria-current={isLive ? 'true' : undefined}
                  className={cn('border-t', isLive && 'bg-copper/10 font-medium')}
                >
                  <td className="p-3 font-mono text-xs">
                    {r.condition}
                    {isLive && <span className="ml-2 font-sans text-copper">← en vivo</span>}
                  </td>
                  <td className="p-3">
                    <StatusChip tone={r.tone} label={r.label} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Regla en revisión (Q-23).</p>
    </section>
  )
}

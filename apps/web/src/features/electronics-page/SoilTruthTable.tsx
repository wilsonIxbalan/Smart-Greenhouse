import type { SoilAptitude, Telemetry } from '@inv/contracts'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { StatusChip, type StatusTone } from '@/components/shared/StatusChip'
import { SOIL_RULES } from '@/config/thresholds'
import { soilVerdict } from '@/lib/sensors'
import { cn } from '@/lib/utils'

const { ec, hum, acid } = SOIL_RULES

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
    verdict: 'NO_APTO',
    condition: `Alguna fuera de rango: EC < ${ec.aptMin} o > ${ec.regMax} µS/cm · humedad < ${hum.regMin} o > ${hum.regMax} % · acidez < ${acid.regMin.toFixed(1)}`,
    tone: 'critical',
    label: 'No apto',
  },
  {
    verdict: 'REGULAR',
    condition: `Alguna en regular: EC ${ec.aptMax}–${ec.regMax} µS/cm · humedad ${hum.regMin}–${hum.aptMin} o ${hum.aptMax}–${hum.regMax} % · acidez ${acid.regMin.toFixed(1)}–${acid.aptMin.toFixed(1)}`,
    tone: 'warning',
    label: 'Regular',
  },
  {
    verdict: 'APTO',
    condition: `Las tres bien: EC ${ec.aptMin}–${ec.aptMax} µS/cm · humedad ${hum.aptMin}–${hum.aptMax} % · acidez ≥ ${acid.aptMin.toFixed(1)}`,
    tone: 'ok',
    label: 'Apto',
  },
]

export function SoilTruthTable({ frame }: { frame: Telemetry | null }) {
  const live = frame ? soilVerdict(frame) : null
  return (
    <section aria-label="Veredicto de suelo" data-testid="section-soil" className="space-y-3">
      <SectionHeader
        title="Tabla de verdad: veredicto de suelo"
        description={
          frame?.suelo_ok
            ? `Lectura viva: EC ${frame.ec ?? '—'} µS/cm · humedad ${frame.suelo_h} % · acidez ${frame.ph?.toFixed(1) ?? '—'}`
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
      <p className="text-xs text-muted-foreground">
        El Mega decide: gana la peor de las tres señales. La acidez es el registro 7 del sensor
        (aproximado, sin calibrar). Umbrales de demo hasta definir el cultivo (Q-15).
      </p>
    </section>
  )
}

import type { Telemetry } from '@inv/contracts'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { ADC, THRESHOLDS } from '@/config/thresholds'
import { Tex } from '@/features/electronics/Tex'
import { pumpLogic } from '@/lib/logic'
import { adcToVolts } from '@/lib/sensors'

const LED_SUPPLY_V = 12
const PWM_MAX = 255

interface Law {
  key: string
  title: string
  general: string
  live: (f: Telemetry) => string | null
  note: string
}

const fx = (n: number, d = 2) => n.toFixed(d)

const LAWS: readonly Law[] = [
  {
    key: 'adc',
    title: 'Conversión ADC de 10 bits',
    general: String.raw`V = \frac{\text{ADC}\cdot 5\,\text{V}}{1023}`,
    live: (f) =>
      String.raw`\text{MQ-7: } \frac{${f.co}\cdot 5}{${ADC.maxCount}} = ${fx(adcToVolts(f.co))}\,\text{V}`,
    note: 'El Mega divide 0–5 V en 1024 niveles: cada cuenta vale unos 4,9 mV.',
  },
  {
    key: 'ohm',
    title: 'Ley de Ohm y divisor de tensión (MQ)',
    general: String.raw`V = I\,R \qquad R_s = R_L\cdot\frac{5 - V}{V}`,
    live: (f) => {
      const v = adcToVolts(f.aire_mq135)
      if (v <= 0) return null
      return String.raw`\text{MQ-135: } V = ${fx(v)}\,\text{V} \Rightarrow \frac{R_s}{R_L} = \frac{5 - ${fx(v)}}{${fx(v)}} = ${fx((5 - v) / v)}`
    },
    note: 'RL del módulo pendiente de medir (Q-26): se muestra la relación Rs/RL.',
  },
  {
    key: 'pwm',
    title: 'PWM en la tira LED (D4)',
    general: String.raw`V_{prom} = \frac{\text{duty}}{255}\cdot 12\,\text{V}`,
    live: (f) => {
      const duty = Math.round((f.luz / 100) * PWM_MAX)
      return String.raw`\frac{${duty}}{255}\cdot 12 = ${fx((duty / PWM_MAX) * LED_SUPPLY_V)}\,\text{V}`
    },
    note: 'duty = luz·255/100. El MOSFET (modelo pendiente, Q-26) conmuta rápido y la tira responde al valor medio. En auto el firmware usa duty 200 ≈ 78 %.',
  },
  {
    key: 'power',
    title: 'Potencia eléctrica',
    general: String.raw`P = V\cdot I`,
    live: () =>
      String.raw`\text{Ej. ilustrativo: } 12\,\text{V}\cdot 0{,}5\,\text{A} = 6\,\text{W}`,
    note: 'Ilustrativo: sin INA219 no se mide la corriente real (Q-18).',
  },
  {
    key: 'hyst',
    title: 'Histéresis del riego',
    general: String.raw`\text{bomba} = \begin{cases} 1 & h < ${THRESHOLDS.soilIrrigateOn}\,\% \\ 0 & h > ${THRESHOLDS.soilIrrigateOff}\,\% \\ \text{previo} & \text{si no} \end{cases}`,
    live: (f) =>
      f.suelo_ok
        ? String.raw`h = ${f.suelo_h}\,\% \Rightarrow \text{bomba} = ${pumpLogic(f.agua === 1, f.suelo_h, f.bomba === 1) ? 1 : 0}`
        : null,
    note: 'La banda muerta evita que la bomba encienda y apague sin parar. Sin agua nunca enciende.',
  },
]

export function LawsSection({ frame }: { frame: Telemetry | null }) {
  return (
    <section aria-label="Leyes aplicadas" data-testid="section-laws" className="space-y-3">
      <SectionHeader title="Leyes aplicadas" description="Con la lectura viva cuando aplica." />
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {LAWS.map((law) => {
          const live = frame ? law.live(frame) : null
          return (
            <li key={law.key} className="min-w-0 space-y-2 rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">{law.title}</h3>
              <div className="overflow-x-auto rounded-md border border-copper/30 p-2">
                <Tex tex={law.general} display />
              </div>
              {live ? (
                <div className="overflow-x-auto rounded-md bg-muted p-2">
                  <Tex tex={live} display />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin lectura válida para calcular.</p>
              )}
              <p className="text-xs text-muted-foreground">{law.note}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

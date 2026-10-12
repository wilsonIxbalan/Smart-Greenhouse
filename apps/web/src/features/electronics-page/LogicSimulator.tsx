import type { Telemetry } from '@inv/contracts'
import { useId, useState } from 'react'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { THRESHOLDS } from '@/config/thresholds'
import { pumpLogic, ventilationLogic, type LogicInputs } from '@/lib/logic'
import { cn } from '@/lib/utils'

interface SimState extends LogicInputs {
  hasWater: boolean
  soilHumidity: number
  pump: boolean
}

type NumKey = 'airTempC' | 'airHumidity' | 'mq135Adc' | 'mq7Adc' | 'soilHumidity'

const SLIDERS: readonly {
  key: NumKey
  label: string
  unit: string
  min: number
  max: number
  step: number
}[] = [
  { key: 'airTempC', label: 'Temperatura del aire', unit: '°C', min: 0, max: 50, step: 0.5 },
  { key: 'airHumidity', label: 'Humedad del aire', unit: '%', min: 0, max: 100, step: 1 },
  { key: 'mq135Adc', label: 'MQ-135', unit: 'ADC', min: 0, max: 1023, step: 1 },
  { key: 'mq7Adc', label: 'MQ-7', unit: 'ADC', min: 0, max: 1023, step: 1 },
  { key: 'soilHumidity', label: 'Humedad de suelo', unit: '%', min: 0, max: 100, step: 1 },
]

const INITIAL: SimState = {
  airTempC: 25,
  airHumidity: 60,
  mq135Adc: 150,
  mq7Adc: 80,
  hasWater: true,
  soilHumidity: 45,
  pump: false,
}

function fromFrame(f: Telemetry): SimState {
  const s = {
    airTempC: f.aire_t,
    airHumidity: f.aire_h,
    mq135Adc: f.aire_mq135,
    mq7Adc: f.co,
    hasWater: f.agua === 1,
    soilHumidity: f.suelo_h,
  }
  return { ...s, pump: pumpLogic(s.hasWater, s.soilHumidity, f.bomba === 1) }
}

function Signal({ label, on, testId }: { label: string; on: boolean; testId?: string }) {
  return (
    <div
      data-testid={testId}
      data-on={on}
      className={cn(
        'flex min-h-11 items-center justify-between gap-2 rounded-md border px-3 text-sm',
        on ? 'border-copper bg-copper/15' : 'border-border bg-muted/40',
      )}
    >
      <span className="font-mono">{label}</span>
      <span className={cn('font-mono font-semibold', on ? 'text-copper' : 'text-muted-foreground')}>
        {on ? '1' : '0'}
      </span>
    </div>
  )
}

function Gate({
  name,
  inputs,
  output,
}: {
  name: string
  inputs: { label: string; on: boolean }[]
  output: { label: string; on: boolean; testId: string }
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="space-y-1">
        {inputs.map((i) => (
          <Signal key={i.label} label={i.label} on={i.on} />
        ))}
      </div>
      <span
        aria-label={`Compuerta ${name}`}
        className="rounded-md border-2 border-copper px-2 py-3 font-mono text-xs font-bold text-copper"
      >
        {name}
      </span>
      <Signal label={output.label} on={output.on} testId={output.testId} />
    </div>
  )
}

export function LogicSimulator({ frame }: { frame: Telemetry | null }) {
  const [s, setS] = useState<SimState>(INITIAL)
  const baseId = useId()
  const out = ventilationLogic(s)
  const T = THRESHOLDS

  const setNum = (key: NumKey, value: number) =>
    setS((prev) => {
      const next = { ...prev, [key]: value }
      return { ...next, pump: pumpLogic(next.hasWater, next.soilHumidity, prev.pump) }
    })
  const setWater = (hasWater: boolean) =>
    setS((prev) => ({ ...prev, hasWater, pump: pumpLogic(hasWater, prev.soilHumidity, prev.pump) }))

  return (
    <section aria-label="Vista lógica" data-testid="section-logic" className="space-y-3">
      <SectionHeader
        title="Vista lógica: alarma, ventilación y riego"
        description="Las mismas expresiones booleanas que ejecuta el Mega en aplicarLogica()."
        action={
          <Button
            variant="outline"
            className="min-h-11"
            disabled={!frame}
            onClick={() => frame && setS(fromFrame(frame))}
          >
            Usar lectura en vivo
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          {SLIDERS.map((sl) => {
            const id = `${baseId}-${sl.key}`
            return (
              <div key={sl.key} className="space-y-1">
                <label htmlFor={id} className="flex justify-between text-sm">
                  <span>{sl.label}</span>
                  <span className="font-mono text-copper">
                    {s[sl.key]} {sl.unit}
                  </span>
                </label>
                <input
                  id={id}
                  type="range"
                  min={sl.min}
                  max={sl.max}
                  step={sl.step}
                  value={s[sl.key]}
                  onChange={(e) => setNum(sl.key, Number(e.target.value))}
                  className="h-11 w-full accent-copper"
                />
              </div>
            )
          })}
          <div className="flex min-h-11 items-center justify-between">
            <label htmlFor={`${baseId}-water`} className="text-sm">
              Hay agua en el depósito (flotador)
            </label>
            <Switch id={`${baseId}-water`} checked={s.hasWater} onCheckedChange={setWater} />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-4">
          <Gate
            name="OR"
            inputs={[
              { label: `T > ${T.airTempMaxC}`, on: s.airTempC > T.airTempMaxC },
              { label: `HR > ${T.airHumidityMax}`, on: s.airHumidity > T.airHumidityMax },
            ]}
            output={{ label: 'ventilar', on: out.ventilar, testId: 'out-ventilar' }}
          />
          <Gate
            name="OR"
            inputs={[
              { label: `MQ135 > ${T.mq135MaxAdc}`, on: s.mq135Adc > T.mq135MaxAdc },
              { label: `MQ7 > ${T.mq7MaxAdc}`, on: s.mq7Adc > T.mq7MaxAdc },
            ]}
            output={{ label: 'gasMalo', on: out.gasMalo, testId: 'out-gasmalo' }}
          />
          <Gate
            name="OR"
            inputs={[
              { label: 'ventilar', on: out.ventilar },
              { label: 'gasMalo', on: out.gasMalo },
            ]}
            output={{ label: 'ventilador', on: out.vent, testId: 'out-vent' }}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Signal
              label={`ventana = ${out.ventanaDeg}°`}
              on={out.ventanaDeg > 0}
              testId="out-ventana"
            />
            <Signal label="alarma = gasMalo" on={out.alarma} testId="out-alarma" />
          </div>
          <div className="space-y-1 border-t pt-3">
            <p className="text-sm font-medium">
              Bomba = agua ∧ (suelo &lt; {T.soilIrrigateOn} % → 1; &gt; {T.soilIrrigateOff} % → 0;
              si no, estado previo)
            </p>
            <Signal label="bomba" on={s.pump} testId="out-bomba" />
          </div>
          <p className="text-xs text-muted-foreground">
            PIR: hoy el firmware abre la puerta a 90° con presencia; se propone solo alarma (Q-07).
            Luz en automático: solo con BH1750 instalado (hoy apagada).
          </p>
        </div>
      </div>
    </section>
  )
}

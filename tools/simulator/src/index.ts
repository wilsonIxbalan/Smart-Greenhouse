import { createInterface } from 'node:readline'
import { parseArgs } from 'node:util'
import type { Scenario } from '@inv/contracts'
import { SimulatedDevice } from './device.ts'

const SCENARIOS: readonly Scenario[] = ['normal', 'co_alto', 'sin_agua', 'falla_suelo']

const { values } = parseArgs({
  options: {
    escenario: { type: 'string', default: 'normal' },
    semilla: { type: 'string', default: '1' },
    intervalo: { type: 'string', default: '2000' },
  },
})

const scenario = values.escenario as Scenario
if (!SCENARIOS.includes(scenario)) {
  console.error(`Escenario inválido. Opciones: ${SCENARIOS.join(', ')}`)
  process.exit(1)
}

const device = new SimulatedDevice(Number(values.semilla), scenario)
const start = Date.now()
const now = () => (Date.now() - start) / 1000

console.error(`Simulador del Mega · escenario ${scenario} · escribe "#1 BOMBA ON 60" y Enter`)

setInterval(() => console.log(JSON.stringify(device.frame(now()))), Number(values.intervalo))

createInterface({ input: process.stdin }).on('line', (line) => {
  const ack = device.handleLine(line, now())
  if (ack) console.log(JSON.stringify(ack))
  else console.error(`Comando no reconocido: ${line}`)
})

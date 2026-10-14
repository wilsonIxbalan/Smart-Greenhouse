import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { parseArgs } from 'node:util'
import type { Scenario } from '@inv/contracts'
import { CloudLink, cloudConfigFromEnv } from './cloud.ts'
import { SimulatedDevice } from './device.ts'

const SCENARIOS: readonly Scenario[] = ['normal', 'co_alto', 'sin_agua', 'falla_suelo']

const { values } = parseArgs({
  options: {
    nube: { type: 'boolean', default: false },
    escenario: { type: 'string', default: 'normal' },
    semilla: { type: 'string', default: '1' },
    intervalo: { type: 'string' },
  },
})

const isScenario = (s: string): s is Scenario => (SCENARIOS as readonly string[]).includes(s)

if (!isScenario(values.escenario)) {
  console.error(`Escenario inválido. Opciones: ${SCENARIOS.join(', ')}`)
  process.exit(1)
}

const device = new SimulatedDevice(Number(values.semilla), values.escenario)
const start = Date.now()
const now = () => (Date.now() - start) / 1000

if (values.nube) runCloud()
else runSerial()

/** Modo serie: emula la línea Serial1 del Mega por stdin/stdout. */
function runSerial() {
  const interval = Number(values.intervalo ?? 2000)
  console.error(
    `Simulador del Mega · escenario ${device.scenario} · escribe "#1 BOMBA ON 60" y Enter`,
  )
  setInterval(() => console.log(JSON.stringify(device.frame(now()))), interval)
  createInterface({ input: process.stdin }).on('line', (line) => {
    const ack = device.handleLine(line, now())
    if (ack) console.log(JSON.stringify(ack))
    else console.error(`Comando no reconocido: ${line}`)
  })
}

/** Modo nube: hace lo mismo que el ESP32 contra Supabase (Q-31: una trama cada 10 s). */
function runCloud() {
  if (existsSync('.env')) process.loadEnvFile('.env')
  let link: CloudLink
  try {
    link = new CloudLink(cloudConfigFromEnv(process.env))
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
  const telemetryMs = Number(values.intervalo ?? process.env.TELEMETRY_INTERVAL_MS ?? 10_000)
  const pollMs = Number(process.env.COMMAND_POLL_MS ?? 2_500)
  const stamp = () => new Date().toLocaleTimeString('es-GT')

  const sendFrame = async () => {
    const frame = device.frame(now())
    try {
      const res = (await link.ingest(frame)) as { lost?: number; reboot?: boolean }
      const extra = res?.reboot ? ' · reinicio detectado' : ''
      console.log(`${stamp()} ↑ trama seq ${frame.seq} · ${device.scenario}${extra}`)
    } catch (e) {
      console.error(`${stamp()} ✗ ${(e as Error).message}`)
    }
  }

  let polling = false
  const pollCommands = async () => {
    if (polling) return
    polling = true
    try {
      for (const cmd of await link.pullCommands()) {
        const ack = device.handleLine(cmd.wire, now()) ?? { ack: cmd.id, ok: 0, err: 'BAD_CMD' }
        await link.ack(ack)
        const result = ack.ok ? 'ok' : `rechazado (${'err' in ack ? ack.err : '?'})`
        console.log(`${stamp()} ↓ ${cmd.wire} → ACK ${result}`)
      }
    } catch (e) {
      console.error(`${stamp()} ✗ ${(e as Error).message}`)
    } finally {
      polling = false
    }
  }

  console.log(
    `Simulador en la nube · trama cada ${telemetryMs / 1000} s · comandos cada ${pollMs / 1000} s`,
  )
  console.log(`Cambia el escenario escribiendo uno de: ${SCENARIOS.join(', ')} · Ctrl+C para salir`)
  void sendFrame()
  setInterval(() => void sendFrame(), telemetryMs)
  setInterval(() => void pollCommands(), pollMs)

  createInterface({ input: process.stdin }).on('line', (line) => {
    const s = line.trim()
    if (isScenario(s)) {
      device.scenario = s
      console.log(`${stamp()} escenario → ${s}`)
      void sendFrame()
    } else if (s) console.error(`Escenario inválido. Opciones: ${SCENARIOS.join(', ')}`)
  })
}

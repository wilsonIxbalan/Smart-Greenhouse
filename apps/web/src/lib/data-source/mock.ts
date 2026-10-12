import {
  DEFAULT_TTL_S,
  generateTelemetry,
  type Ack,
  type Actuator,
  type Command,
  type Scenario,
  type Telemetry,
} from '@inv/contracts'
import { THRESHOLDS, TIMING } from '@/config/thresholds'
import { isStale } from '@/lib/sensors'
import {
  CommandExpiredError,
  type DataSource,
  type DeviceStatus,
  type HistoryRange,
  type Reading,
} from './types'

export interface MockOptions {
  seed?: number
  scenario?: Scenario
  now?: () => number
  random?: () => number
  frameIntervalMs?: number
  ackDelayMs?: number
  commandTimeoutMs?: number
  /** Probabilidad (0–1) de que un comando nunca reciba ACK y expire. */
  dropAckRate?: number
  lightSensor?: boolean
}

interface Override {
  value: number
  expiresAt: number
}

const DAY_S = 86_400
// Segundos simulados al "arrancar": deja 24 h de historia con t >= 0.
const BOOT_OFFSET_S = DAY_S
const DEFAULT_SEED = 507

export class MockDataSource implements DataSource {
  readonly kind = 'mock' as const
  private readonly seed: number
  private scenario: Scenario
  private readonly now: () => number
  private readonly random: () => number
  private readonly frameIntervalMs: number
  private readonly ackDelayMs: number
  private readonly commandTimeoutMs: number
  private readonly dropAckRate: number
  private readonly lightSensor: boolean
  private readonly startedAt: number
  private readonly startOfDayS: number
  private readonly overrides = new Map<Actuator, Override>()
  private readonly listeners = new Set<(r: Reading) => void>()
  private timer: ReturnType<typeof setInterval> | null = null
  private lastSeenAt: number | null = null

  constructor(opts: MockOptions = {}) {
    this.seed = opts.seed ?? DEFAULT_SEED
    this.scenario = opts.scenario ?? 'normal'
    this.now = opts.now ?? Date.now
    this.random = opts.random ?? Math.random
    this.frameIntervalMs = opts.frameIntervalMs ?? TIMING.frameIntervalMs
    this.ackDelayMs = opts.ackDelayMs ?? TIMING.mockAckDelayMs
    this.commandTimeoutMs = opts.commandTimeoutMs ?? TIMING.commandTimeoutMs
    this.dropAckRate = opts.dropAckRate ?? 0
    this.lightSensor = opts.lightSensor ?? true
    this.startedAt = this.now()
    const d = new Date(this.startedAt)
    const secondOfDay = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
    this.startOfDayS = (((secondOfDay - BOOT_OFFSET_S) % DAY_S) + DAY_S) % DAY_S
  }

  getScenario(): Scenario {
    return this.scenario
  }

  setScenario(scenario: Scenario): void {
    this.scenario = scenario
  }

  getLatest(): Promise<Reading | null> {
    return Promise.resolve(this.readingAt(this.now()))
  }

  getHistory(range: HistoryRange): Promise<Reading[]> {
    const end = this.now()
    const start = end - TIMING.historyRangeMs[range]
    const out: Reading[] = []
    for (let at = start; at <= end; at += TIMING.historyStepMs) {
      out.push({ frame: this.frameAt(at, false), receivedAt: at })
    }
    return Promise.resolve(out)
  }

  subscribe(onFrame: (reading: Reading) => void): () => void {
    this.listeners.add(onFrame)
    this.timer ??= setInterval(() => this.emit(), this.frameIntervalMs)
    return () => {
      this.listeners.delete(onFrame)
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    }
  }

  getDeviceStatus(): Promise<DeviceStatus> {
    const lastSeenAt = this.lastSeenAt ?? this.now()
    return Promise.resolve({ lastSeenAt, online: !isStale(lastSeenAt, this.now()) })
  }

  sendCommand(cmd: Command): Promise<Ack> {
    if (this.random() < this.dropAckRate) {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new CommandExpiredError(cmd.id)), this.commandTimeoutMs)
      })
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.execute(cmd)), this.ackDelayMs)
    })
  }

  private execute(cmd: Command): Ack {
    const at = this.now()
    const frame = this.frameAt(at, true)
    if (cmd.kind === 'switch' && cmd.act === 'bomba' && cmd.on && frame.agua === 0) {
      return { ack: cmd.id, ok: 0, err: 'NO_WATER' }
    }
    const coHigh = frame.co > THRESHOLDS.mq7MaxAdc
    if (cmd.kind === 'switch' && cmd.act === 'vent' && !cmd.on && coHigh) {
      return { ack: cmd.id, ok: 0, err: 'INTERLOCK_CO' }
    }
    if (cmd.kind === 'auto') {
      if (cmd.act) this.overrides.delete(cmd.act)
      else this.overrides.clear()
      return { ack: cmd.id, ok: 1 }
    }
    const value = cmd.kind === 'switch' ? (cmd.on ? 1 : 0) : cmd.val
    const ttl = cmd.ttl ?? DEFAULT_TTL_S
    this.overrides.set(cmd.act, { value, expiresAt: at + ttl * 1000 })
    return { ack: cmd.id, ok: 1 }
  }

  private emit(): void {
    const reading = this.readingAt(this.now())
    this.listeners.forEach((fn) => fn(reading))
  }

  private readingAt(at: number): Reading {
    this.lastSeenAt = at
    return { frame: this.frameAt(at, true), receivedAt: at }
  }

  private frameAt(at: number, withOverrides: boolean): Telemetry {
    const t = Math.max(0, BOOT_OFFSET_S + (at - this.startedAt) / 1000)
    const frame = generateTelemetry(this.seed, t, {
      scenario: this.scenario,
      startOfDayS: this.startOfDayS,
      lightSensor: this.lightSensor,
    })
    if (!withOverrides) return frame
    const man: Telemetry['man'] = {}
    for (const [act, ov] of this.overrides) {
      const remaining = Math.ceil((ov.expiresAt - at) / 1000)
      if (remaining <= 0) {
        this.overrides.delete(act)
        continue
      }
      man[act] = remaining
      applyActuator(frame, act, ov.value)
    }
    // Interlock físico: sin agua la bomba no arranca aunque haya un manual vigente.
    if (frame.agua === 0) frame.bomba = 0
    return { ...frame, man }
  }
}

function applyActuator(frame: Telemetry, act: Actuator, value: number): void {
  switch (act) {
    case 'bomba':
    case 'vent':
    case 'alarma':
      frame[act] = value ? 1 : 0
      return
    case 'luz':
    case 'ventana':
    case 'puerta':
      frame[act] = value
  }
}

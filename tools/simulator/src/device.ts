import {
  ackCommand,
  DEFAULT_TTL_S,
  generateTelemetry,
  parseCommand,
  type Ack,
  type Actuator,
  type Command,
  type Scenario,
  type Telemetry,
} from '@inv/contracts'

interface ManualOverride {
  value: number
  expiresAt: number
}

/**
 * Emula al Mega: trama del generador + overrides manuales con TTL.
 */
export class SimulatedDevice {
  private manual = new Map<Actuator, ManualOverride>()
  private acks = new Map<number, Ack>()

  private readonly seed: number
  scenario: Scenario

  constructor(seed: number, scenario: Scenario = 'normal') {
    this.seed = seed
    this.scenario = scenario
  }

  frame(now: number): Telemetry {
    const base = generateTelemetry(this.seed, now, { scenario: this.scenario })
    for (const [act, o] of this.manual) if (o.expiresAt <= now) this.manual.delete(act)

    const out: Telemetry = { ...base, man: {} }
    for (const [act, o] of this.manual) {
      out[act] = o.value as never
      out.man[act] = Math.ceil(o.expiresAt - now)
    }
    if (out.agua === 0) out.bomba = 0
    if (base.alarma === 1) {
      out.vent = 1
      out.alarma = 1
    }
    return out
  }

  handleLine(line: string, now: number): Ack | null {
    const idMatch = /^#(\d+)/.exec(line.trim())
    if (!idMatch) return null
    const id = Number(idMatch[1])
    const cached = this.acks.get(id)
    if (cached) return cached

    const cmd = parseCommand(line)
    const ack = cmd ? this.apply(cmd, now) : { ack: id, ok: 0 as const, err: 'BAD_CMD' as const }
    this.acks.set(id, ack)
    return ack
  }

  private apply(cmd: Command, now: number): Ack {
    const current = generateTelemetry(this.seed, now, { scenario: this.scenario })
    if (cmd.kind === 'auto') {
      if (cmd.act) this.manual.delete(cmd.act)
      else this.manual.clear()
      return { ack: cmd.id, ok: 1, cmd: ackCommand(cmd) }
    }
    if (cmd.kind === 'switch' && cmd.act === 'bomba' && cmd.on && current.agua === 0) {
      return { ack: cmd.id, ok: 0, err: 'NO_WATER' }
    }
    if (cmd.kind === 'switch' && cmd.act === 'vent' && !cmd.on && current.alarma === 1) {
      return { ack: cmd.id, ok: 0, err: 'INTERLOCK_CO' }
    }
    const value = cmd.kind === 'switch' ? (cmd.on ? 1 : 0) : cmd.val
    this.manual.set(cmd.act, { value, expiresAt: now + (cmd.ttl ?? DEFAULT_TTL_S) })
    return { ack: cmd.id, ok: 1, cmd: ackCommand(cmd) }
  }
}

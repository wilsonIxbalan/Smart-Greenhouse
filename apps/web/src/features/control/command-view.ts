import type { Actuator } from '@inv/contracts'
import type { ActuatorDef } from '@/config/actuators'
import { TIMING } from '@/config/thresholds'
import type { CommandRow, Reading } from '@/lib/supabase/types'
import { isInFlight } from './hooks'

const isGlobalAuto = (c: CommandRow) => c.kind === 'auto' && c.actuator === null
const isReplaced = (c: CommandRow) => c.status === 'expired' && c.error === 'REPLACED'

/** Último comando global (AUTO de todo), si lo hay. */
export function lastGlobalCommand(commands: readonly CommandRow[]): CommandRow | null {
  return commands.find((c) => isGlobalAuto(c) && !isReplaced(c)) ?? null
}

/** Último comando propio del actuador; null si después hubo un AUTO global (ese se muestra arriba). */
export function lastCommandFor(commands: readonly CommandRow[], act: Actuator): CommandRow | null {
  const last = commands.find((c) => (c.actuator === act || isGlobalAuto(c)) && !isReplaced(c))
  return last && !isGlobalAuto(last) ? last : null
}

/**
 * BR-C06: en curso siempre se muestra. Confirmado, hasta que llega una trama posterior al ACK
 * (desde ahí la tarjeta ya muestra el estado real). Rechazado o expirado, durante un par de minutos.
 */
export function isFeedbackVisible(c: CommandRow, reading: Reading | null, now: number): boolean {
  if (isInFlight(c)) return true
  const resolvedAt = c.resolvedAt ?? c.createdAt
  if (now - resolvedAt > TIMING.command.feedbackMs) return false
  if (c.status === 'acked') return !reading || reading.receivedAt <= resolvedAt
  return true
}

/** "Encender · 10 min", "30 % · 5 min", "Volver a automático". */
export function describeCommand(c: CommandRow, def?: ActuatorDef): string {
  if (c.kind === 'auto') return c.actuator ? 'Volver a automático' : 'Todo a automático'
  const value = c.value ?? 0
  const action =
    c.kind === 'switch' ? (value ? 'Encender' : 'Apagar') : (def?.format(value) ?? String(value))
  return c.ttlS ? `${action} · ${Math.round(c.ttlS / 60)} min` : action
}

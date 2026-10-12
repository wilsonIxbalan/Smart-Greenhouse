import { z } from 'zod'
import { actuatorSchema, type Actuator } from './telemetry.ts'

export const DEFAULT_TTL_S = 600
export const MAX_TTL_S = 3600

export const ERROR_CODES = ['NO_WATER', 'INTERLOCK_CO', 'BAD_CMD', 'BAD_VAL'] as const
export const errorCodeSchema = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof errorCodeSchema>

const ttl = z.number().int().min(1).max(MAX_TTL_S)

// Comando lógico. En el cable viaja como texto: `#507 BOMBA ON 600` (ver formatCommand).
export const commandSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('switch'),
    id: z.number().int().positive(),
    act: z.enum(['bomba', 'vent', 'alarma']),
    on: z.boolean(),
    ttl: ttl.optional(),
  }),
  z.object({
    kind: z.literal('level'),
    id: z.number().int().positive(),
    act: z.literal('luz'),
    val: z.number().int().min(0).max(100),
    ttl: ttl.optional(),
  }),
  z.object({
    kind: z.literal('angle'),
    id: z.number().int().positive(),
    act: z.enum(['ventana', 'puerta']),
    val: z.number().int().min(0).max(90),
    ttl: ttl.optional(),
  }),
  z.object({
    kind: z.literal('auto'),
    id: z.number().int().positive(),
    act: actuatorSchema.optional(),
  }),
])
export type Command = z.infer<typeof commandSchema>

export const ackSchema = z.union([
  z.object({ ack: z.number().int().positive(), ok: z.literal(1) }).strict(),
  z.object({ ack: z.number().int().positive(), ok: z.literal(0), err: errorCodeSchema }).strict(),
])
export type Ack = z.infer<typeof ackSchema>

const WIRE_NAME: Record<Actuator, string> = {
  bomba: 'BOMBA',
  vent: 'VENT',
  luz: 'LUZ',
  ventana: 'VENTANA',
  puerta: 'PUERTA',
  alarma: 'ALARMA',
}
const FROM_WIRE = Object.fromEntries(Object.entries(WIRE_NAME).map(([k, v]) => [v, k])) as Record<
  string,
  Actuator
>

export function formatCommand(cmd: Command): string {
  const head = `#${cmd.id}`
  switch (cmd.kind) {
    case 'switch':
      return [head, WIRE_NAME[cmd.act], cmd.on ? 'ON' : 'OFF', cmd.ttl].filter(Boolean).join(' ')
    case 'level':
    case 'angle':
      return [head, WIRE_NAME[cmd.act], cmd.val, cmd.ttl].filter((x) => x !== undefined).join(' ')
    case 'auto':
      return cmd.act ? `${head} AUTO ${WIRE_NAME[cmd.act]}` : `${head} AUTO`
  }
}

/** Interpreta una línea `#id CMD [val] [ttl]`. Devuelve null si no es válida. */
export function parseCommand(line: string): Command | null {
  const parts = line.trim().toUpperCase().split(/\s+/)
  const idTok = parts[0]
  if (!idTok?.startsWith('#')) return null
  const id = Number(idTok.slice(1))
  const [name, arg, ttlTok] = parts.slice(1)
  const ttlVal = ttlTok === undefined ? undefined : Number(ttlTok)

  let candidate: unknown
  if (name === 'AUTO') {
    candidate = { kind: 'auto', id, ...(arg ? { act: FROM_WIRE[arg] ?? arg } : {}) }
  } else {
    const act = name ? FROM_WIRE[name] : undefined
    if (act === 'bomba' || act === 'vent' || act === 'alarma') {
      if (arg !== 'ON' && arg !== 'OFF') return null
      candidate = { kind: 'switch', id, act, on: arg === 'ON', ttl: ttlVal }
    } else if (act === 'luz') {
      candidate = { kind: 'level', id, act, val: Number(arg), ttl: ttlVal }
    } else if (act === 'ventana' || act === 'puerta') {
      candidate = { kind: 'angle', id, act, val: Number(arg), ttl: ttlVal }
    } else {
      return null
    }
  }
  const parsed = commandSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

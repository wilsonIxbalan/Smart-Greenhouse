import { z } from 'zod'

const PG_TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}(?::?\d{2})?)?$/

/**
 * timestamptz → ms epoch. Realtime entrega el formato de Postgres ("2026-10-13 12:00:00.123456+00"),
 * que Safari no acepta en Date.parse; se normaliza a ISO 8601 con milisegundos.
 */
export function parseTimestamp(value: string): number {
  const m = PG_TIMESTAMP.exec(value.trim())
  if (!m) return Number.NaN
  const fraction = m[3] ? m[3].slice(0, 4).padEnd(4, '0') : ''
  let zone = m[4] ?? 'Z'
  if (/^[+-]\d{2}$/.test(zone)) zone += ':00'
  else if (/^[+-]\d{4}$/.test(zone)) zone = `${zone.slice(0, 3)}:${zone.slice(3)}`
  return Date.parse(`${m[1]}T${m[2]}${fraction}${zone}`)
}

export const timestampSchema = z
  .string()
  .transform(parseTimestamp)
  .refine((ms) => Number.isFinite(ms), { error: 'fecha inválida' })

/** numeric/bigint de Postgres: PostgREST puede enviarlo como número o como texto. */
export const pgNumber = z
  .union([z.number(), z.string()])
  .transform(Number)
  .refine((n) => Number.isFinite(n), { error: 'número inválido' })

/** Error para la UI: contexto en español + detalle técnico (también en la consola). */
export function dataError(context: string, cause: { message: string }): Error {
  console.error(`[datos] ${context}:`, cause.message)
  return new Error(`${context}. Detalle: ${cause.message}`)
}

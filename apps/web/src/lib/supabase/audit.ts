import { z } from 'zod'
import { ROLES } from '@/config/permissions'
import { getSupabase } from './client'
import { dataError, pgNumber, timestampSchema } from './parse'
import {
  ALERT_TYPES,
  COMMAND_STATUSES,
  type AlertType,
  type AuditEntry,
  type AuditPerson,
  type CommandStatus,
} from './types'

const auditRowSchema = z
  .object({
    id: pgNumber,
    actor: z.string().nullable(),
    action: z.string(),
    entity: z.string(),
    entity_id: z.string().nullable(),
    details: z.record(z.string(), z.unknown()).nullable(),
    created_at: timestampSchema,
  })
  .transform((r): AuditEntry => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    details: r.details,
    createdAt: r.created_at,
  }))

function parseRows<T>(rows: unknown[], schema: z.ZodType<T>, label: string): T[] {
  return rows.flatMap((row) => {
    const parsed = schema.safeParse(row)
    if (parsed.success) return [parsed.data]
    console.warn(`[bitácora] ${label} descartada:`, z.prettifyError(parsed.error))
    return []
  })
}

/** Una página de la bitácora, de la más nueva a la más vieja. RLS: solo admin recibe filas. */
export async function fetchAuditPage(
  entities: readonly string[] | null,
  beforeId: number | null,
  limit: number,
): Promise<AuditEntry[]> {
  let q = getSupabase()
    .from('audit_log')
    .select('id, actor, action, entity, entity_id, details, created_at')
    .order('id', { ascending: false })
    .limit(limit)
  if (entities) q = q.in('entity', entities)
  if (beforeId !== null) q = q.lt('id', beforeId)
  const { data, error } = await q
  if (error) throw dataError('No se pudo leer la bitácora', error)
  return parseRows(data as unknown[], auditRowSchema, 'entrada')
}

const personSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  role: z.enum(ROLES),
})

/** Nombre y rol de cada usuario (el admin ve todos los perfiles). */
export async function fetchPeople(): Promise<Map<string, AuditPerson>> {
  const { data, error } = await getSupabase().from('profiles').select('id, email, full_name, role')
  if (error) throw dataError('No se pudieron leer los usuarios', error)
  const people = parseRows(data as unknown[], personSchema, 'perfil')
  return new Map(
    people.map((p) => [p.id, { name: p.full_name ?? p.email ?? 'Sin nombre', role: p.role }]),
  )
}

const commandStatusSchema = z.object({
  id: pgNumber,
  status: z.enum(COMMAND_STATUSES),
  error: z.string().nullable(),
})

/** Estado actual de los comandos citados en la bitácora. */
export async function fetchCommandOutcomes(
  ids: readonly number[],
): Promise<Map<number, { status: CommandStatus; error: string | null }>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await getSupabase()
    .from('commands')
    .select('id, status, error')
    .in('id', ids)
  if (error) throw dataError('No se pudo leer el estado de los comandos', error)
  const rows = parseRows(data as unknown[], commandStatusSchema, 'comando')
  return new Map(rows.map((r) => [r.id, { status: r.status, error: r.error }]))
}

const alertTypeSchema = z.object({ id: pgNumber, type: z.enum(ALERT_TYPES) })

/** Tipo de las alertas reconocidas que aparecen en la bitácora. */
export async function fetchAlertTypes(ids: readonly number[]): Promise<Map<number, AlertType>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await getSupabase().from('alerts').select('id, type').in('id', ids)
  if (error) throw dataError('No se pudieron leer las alertas citadas', error)
  const rows = parseRows(data as unknown[], alertTypeSchema, 'alerta')
  return new Map(rows.map((r) => [r.id, r.type]))
}

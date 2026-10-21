import { actuatorSchema } from '@inv/contracts'
import { z } from 'zod'
import { getSupabase } from './client'
import { dataError, pgNumber, timestampSchema } from './parse'
import { COMMAND_KINDS, COMMAND_STATUSES, type CommandRequest, type CommandRow } from './types'

const COLUMNS = 'id, kind, actuator, value, ttl_s, status, error, created_at, resolved_at'

const commandRowSchema = z
  .object({
    id: pgNumber,
    kind: z.enum(COMMAND_KINDS),
    actuator: actuatorSchema.nullable(),
    value: pgNumber.nullable(),
    ttl_s: pgNumber.nullable(),
    status: z.enum(COMMAND_STATUSES),
    error: z.string().nullable(),
    created_at: timestampSchema,
    resolved_at: timestampSchema.nullable(),
  })
  .transform((r): CommandRow => ({
    id: r.id,
    kind: r.kind,
    actuator: r.actuator,
    value: r.value,
    ttlS: r.ttl_s,
    status: r.status,
    error: r.error,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  }))

/** Fila de `commands` (consulta o Realtime) → CommandRow; null si no cumple el formato. */
export function toCommandRow(row: unknown): CommandRow | null {
  const parsed = commandRowSchema.safeParse(row)
  if (!parsed.success) {
    console.warn('[comandos] fila descartada:', z.prettifyError(parsed.error))
    return null
  }
  return parsed.data
}

// Mensajes que lanza issue_command()
const RPC_ERRORS: Record<string, string> = {
  forbidden: 'Tu usuario no tiene permiso para enviar comandos o está inactivo.',
  unknown_device: 'El dispositivo no existe o está desactivado.',
  bad_value: 'El valor no es válido para este actuador.',
  bad_ttl: 'La duración del modo manual no es válida.',
}

/** BR-C01: el comando solo se crea por la RPC; la base valida, registra en audit_log y arma la línea. */
export async function issueCommand(deviceId: string, req: CommandRequest): Promise<CommandRow> {
  const { data, error } = await getSupabase().rpc('issue_command', {
    p_device_id: deviceId,
    p_kind: req.kind,
    p_actuator: req.actuator,
    p_value: req.value,
    p_ttl_s: req.ttlS,
  })
  if (error) {
    const known = RPC_ERRORS[error.message]
    if (known) throw new Error(known)
    throw dataError('No se pudo enviar el comando', error)
  }
  const row = toCommandRow(data)
  if (!row) throw new Error('La base respondió el comando con un formato inesperado.')
  return row
}

/** Comandos creados desde `sinceMs` (hora del servidor), del más nuevo al más viejo. */
export async function fetchRecentCommands(
  deviceId: string,
  sinceMs: number,
): Promise<CommandRow[]> {
  const { data, error } = await getSupabase()
    .from('commands')
    .select(COLUMNS)
    .eq('device_id', deviceId)
    .gte('created_at', new Date(sinceMs).toISOString())
    .order('id', { ascending: false })
    .limit(50)
  if (error) throw dataError('No se pudieron leer los comandos', error)
  return (data as unknown[]).map(toCommandRow).filter((r): r is CommandRow => r !== null)
}

interface CommandsHandlers {
  onChange: (row: CommandRow) => void
  onResync: () => void
}

let channelSeq = 0

/** Realtime: comandos nuevos y cambios de estado (sent, acked, failed, expired) del dispositivo. */
export function subscribeToCommands(deviceId: string, handlers: CommandsHandlers): () => void {
  const supabase = getSupabase()
  let subscribedBefore = false
  const channel = supabase
    .channel(`commands:${deviceId}:${++channelSeq}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'commands', filter: `device_id=eq.${deviceId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') return
        const row = toCommandRow(payload.new)
        if (row) handlers.onChange(row)
      },
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        if (subscribedBefore) handlers.onResync()
        subscribedBefore = true
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[tiempo real] canal de comandos: ${status}`, err?.message ?? '')
      }
    })
  return () => {
    void supabase.removeChannel(channel)
  }
}

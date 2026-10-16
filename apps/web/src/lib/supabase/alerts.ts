import { z } from 'zod'
import { getSupabase } from './client'
import { dataError, pgNumber, timestampSchema } from './parse'
import { ALERT_SEVERITIES, ALERT_TYPES, type AlertRow } from './types'

const COLUMNS =
  'id, type, severity, message, value, created_at, acknowledged_by, acknowledged_at, resolved_at'
const MAX_ROWS = 100

const alertRowSchema = z
  .object({
    id: pgNumber,
    type: z.enum(ALERT_TYPES),
    severity: z.enum(ALERT_SEVERITIES),
    message: z.string(),
    value: pgNumber.nullable(),
    created_at: timestampSchema,
    acknowledged_by: z.string().nullable(),
    acknowledged_at: timestampSchema.nullable(),
    resolved_at: timestampSchema.nullable(),
  })
  .transform((r): AlertRow => ({
    id: r.id,
    type: r.type,
    severity: r.severity,
    message: r.message,
    value: r.value,
    createdAt: r.created_at,
    acknowledgedBy: r.acknowledged_by,
    acknowledgedAt: r.acknowledged_at,
    resolvedAt: r.resolved_at,
  }))

/** Fila de `alerts` (consulta, RPC o Realtime) → AlertRow; null si no cumple el formato. */
export function toAlertRow(row: unknown): AlertRow | null {
  const parsed = alertRowSchema.safeParse(row)
  if (!parsed.success) {
    console.warn('[alertas] fila descartada:', z.prettifyError(parsed.error))
    return null
  }
  return parsed.data
}

/** Alertas abiertas más las creadas desde `sinceMs`, de la más nueva a la más vieja. */
export async function fetchAlerts(deviceId: string, sinceMs: number): Promise<AlertRow[]> {
  const { data, error } = await getSupabase()
    .from('alerts')
    .select(COLUMNS)
    .eq('device_id', deviceId)
    // Comillas: la fecha ISO lleva "." y ":", reservados en los filtros or() de PostgREST.
    .or(`resolved_at.is.null,created_at.gte."${new Date(sinceMs).toISOString()}"`)
    .order('id', { ascending: false })
    .limit(MAX_ROWS)
  if (error) throw dataError('No se pudieron leer las alertas', error)
  return (data as unknown[]).map(toAlertRow).filter((r): r is AlertRow => r !== null)
}

const RPC_ERRORS: Record<string, string> = {
  forbidden: 'Tu usuario no tiene permiso para reconocer alertas o está inactivo.',
  unknown_alert: 'La alerta ya no existe.',
}

/** Marca la alerta como vista (acknowledge_alert registra quién y cuándo, y deja huella en audit_log). */
export async function acknowledgeAlert(alertId: number): Promise<AlertRow> {
  const { data, error } = await getSupabase().rpc('acknowledge_alert', { p_alert_id: alertId })
  if (error) {
    const known = RPC_ERRORS[error.message]
    if (known) throw new Error(known)
    throw dataError('No se pudo reconocer la alerta', error)
  }
  const row = toAlertRow(data)
  if (!row) throw new Error('La base respondió la alerta con un formato inesperado.')
  return row
}

interface AlertsHandlers {
  onChange: (row: AlertRow) => void
  onResync: () => void
}

let channelSeq = 0

/** Realtime: alertas nuevas, reconocidas y resueltas del dispositivo. */
export function subscribeToAlerts(deviceId: string, handlers: AlertsHandlers): () => void {
  const supabase = getSupabase()
  let subscribedBefore = false
  const channel = supabase
    .channel(`alerts:${deviceId}:${++channelSeq}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alerts', filter: `device_id=eq.${deviceId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') return
        const row = toAlertRow(payload.new)
        if (row) handlers.onChange(row)
      },
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        if (subscribedBefore) handlers.onResync()
        subscribedBefore = true
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[tiempo real] canal de alertas: ${status}`, err?.message ?? '')
      }
    })
  return () => {
    void supabase.removeChannel(channel)
  }
}

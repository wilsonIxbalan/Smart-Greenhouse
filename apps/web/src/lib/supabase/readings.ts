import { telemetrySchema } from '@inv/contracts'
import { z } from 'zod'
import { getSupabase } from './client'
import { dataError, pgNumber, timestampSchema } from './parse'
import type { HistoryPoint, Reading } from './types'

const readingRowSchema = z.object({ raw: z.unknown(), received_at: timestampSchema })

/** Fila de `readings` → Reading. Si la trama no cumple el contrato v1 se descarta (null). */
export function toReading(row: unknown): Reading | null {
  const parsedRow = readingRowSchema.safeParse(row)
  if (!parsedRow.success) {
    console.warn('[lecturas] fila descartada:', z.prettifyError(parsedRow.error))
    return null
  }
  const frame = telemetrySchema.safeParse(parsedRow.data.raw)
  if (!frame.success) {
    console.warn(
      '[lecturas] trama descartada, no cumple el contrato v1:',
      z.prettifyError(frame.error),
    )
    return null
  }
  return { frame: frame.data, receivedAt: parsedRow.data.received_at }
}

export async function fetchLatestReading(deviceId: string): Promise<Reading | null> {
  const { data, error } = await getSupabase()
    .from('v_latest_reading')
    .select('raw, received_at')
    .eq('device_id', deviceId)
    // con LIMIT el DISTINCT ON de la vista se detiene en la primera fila del índice
    .limit(1)
    .maybeSingle()
  if (error) throw dataError('No se pudo leer la última lectura', error)
  if (!data) return null
  const reading = toReading(data)
  if (!reading) {
    throw new Error(
      'La última trama no cumple el contrato v1 y se descartó (detalle en la consola).',
    )
  }
  return reading
}

const nullableAvg = pgNumber.nullable()
const historyRowSchema = z.object({
  bucket: timestampSchema,
  samples: pgNumber,
  aire_t: nullableAvg,
  aire_h: nullableAvg,
  suelo_h: nullableAvg,
  lux: nullableAvg,
  aire_mq135: nullableAvg,
  co: nullableAvg,
})

/** Promedios por bloque (RPC `reading_history`): nunca se traen las lecturas crudas de 24 h. */
export async function fetchHistory(
  deviceId: string,
  hours: number,
  bucketMinutes: number,
): Promise<HistoryPoint[]> {
  const { data, error } = await getSupabase().rpc('reading_history', {
    p_device_id: deviceId,
    p_hours: hours,
    p_bucket_minutes: bucketMinutes,
  })
  if (error) throw dataError('No se pudo leer el historial', error)
  const parsed = z.array(historyRowSchema).safeParse(data)
  if (!parsed.success) {
    throw dataError('El historial llegó con un formato inesperado', {
      message: z.prettifyError(parsed.error),
    })
  }
  return parsed.data.map(({ bucket, ...rest }) => ({ t: bucket, ...rest }))
}

interface ReadingsHandlers {
  onReading: (reading: Reading) => void
  /** El canal se reconectó: puede haberse perdido algo, conviene volver a consultar. */
  onResync: () => void
}

let channelSeq = 0

/** Realtime: INSERT en `readings` del dispositivo (respeta la RLS de la sesión). */
export function subscribeToReadings(deviceId: string, handlers: ReadingsHandlers): () => void {
  const supabase = getSupabase()
  let subscribedBefore = false
  // Tópico único por suscripción: el cliente reutiliza canales con el mismo nombre.
  const channel = supabase
    .channel(`readings:${deviceId}:${++channelSeq}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'readings',
        filter: `device_id=eq.${deviceId}`,
      },
      (payload) => {
        const reading = toReading(payload.new)
        if (reading) handlers.onReading(reading)
      },
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        if (subscribedBefore) handlers.onResync()
        subscribedBefore = true
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[tiempo real] canal de lecturas: ${status}`, err?.message ?? '')
      }
    })
  return () => {
    void supabase.removeChannel(channel)
  }
}

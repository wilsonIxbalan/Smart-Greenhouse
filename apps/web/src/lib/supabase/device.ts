import { z } from 'zod'
import { syncServerClock } from '@/lib/server-clock'
import { getSupabase } from './client'
import { dataError, pgNumber, timestampSchema } from './parse'
import type { DeviceStatus } from './types'

const deviceStatusSchema = z.object({
  online: z.boolean(),
  last_seen_at: timestampSchema.nullable(),
  seconds_since_seen: pgNumber.nullable(),
  open_alerts: pgNumber,
})

/** Estado desde `v_device_status`; null si el dispositivo no existe o la RLS no lo deja ver. */
export async function fetchDeviceStatus(deviceId: string): Promise<DeviceStatus | null> {
  const { data, error } = await getSupabase()
    .from('v_device_status')
    .select('online, last_seen_at, seconds_since_seen, open_alerts')
    .eq('device_id', deviceId)
    .maybeSingle()
  if (error) throw dataError('No se pudo leer el estado del dispositivo', error)
  if (!data) return null
  const parsed = deviceStatusSchema.safeParse(data)
  if (!parsed.success) {
    throw dataError('El estado del dispositivo llegó con un formato inesperado', {
      message: z.prettifyError(parsed.error),
    })
  }
  const { online, last_seen_at, seconds_since_seen, open_alerts } = parsed.data
  if (last_seen_at !== null && seconds_since_seen !== null) {
    syncServerClock(last_seen_at + seconds_since_seen * 1000)
  }
  return { online, lastSeenAt: last_seen_at, openAlerts: open_alerts }
}

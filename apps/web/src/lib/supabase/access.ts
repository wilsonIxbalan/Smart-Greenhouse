import { z } from 'zod'
import type { AccessCard, AccessEvent, AccessSync } from './types'
import { getSupabase } from './client'
import { dataError, pgNumber, timestampSchema } from './parse'

const CARD_COLUMNS = 'id, uid, holder, active, created_at, updated_at'
const EVENT_COLUMNS = 'id, uid, granted, card_id, holder, received_at'

const cardSchema = z
  .object({
    id: pgNumber,
    uid: z.string(),
    holder: z.string(),
    active: z.boolean(),
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .transform((r): AccessCard => ({
    id: r.id,
    uid: r.uid,
    holder: r.holder,
    active: r.active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

const eventSchema = z
  .object({
    id: pgNumber,
    uid: z.string(),
    granted: z.boolean(),
    card_id: pgNumber.nullable(),
    holder: z.string().nullable(),
    received_at: timestampSchema,
  })
  .transform((r): AccessEvent => ({
    id: r.id,
    uid: r.uid,
    granted: r.granted,
    cardId: r.card_id,
    holder: r.holder,
    receivedAt: r.received_at,
  }))

const syncSchema = z
  .object({
    cards_version: pgNumber,
    mega_version: pgNumber.nullable(),
    checked_at: timestampSchema.nullable(),
  })
  .transform((r): AccessSync => ({
    cardsVersion: r.cards_version,
    megaVersion: r.mega_version,
    checkedAt: r.checked_at,
  }))

function parseOne<T>(schema: z.ZodType<T>, row: unknown, label: string): T | null {
  const parsed = schema.safeParse(row)
  if (parsed.success) return parsed.data
  console.warn(`[accesos] ${label} descartada:`, z.prettifyError(parsed.error))
  return null
}

const parseMany = <T>(schema: z.ZodType<T>, rows: unknown[], label: string): T[] =>
  rows.map((r) => parseOne(schema, r, label)).filter((r): r is T => r !== null)

export const toAccessEvent = (row: unknown) => parseOne(eventSchema, row, 'entrada')

/** Tarjetas del dispositivo: activas primero, luego por nombre. */
export async function fetchCards(deviceId: string): Promise<AccessCard[]> {
  const { data, error } = await getSupabase()
    .from('rfid_cards')
    .select(CARD_COLUMNS)
    .eq('device_id', deviceId)
    .order('active', { ascending: false })
    .order('holder', { ascending: true })
  if (error) throw dataError('No se pudieron leer las tarjetas', error)
  return parseMany(cardSchema, data as unknown[], 'tarjeta')
}

/** Últimos intentos en el lector, del más nuevo al más viejo. */
export async function fetchEvents(deviceId: string, limit: number): Promise<AccessEvent[]> {
  const { data, error } = await getSupabase()
    .from('rfid_events')
    .select(EVENT_COLUMNS)
    .eq('device_id', deviceId)
    .order('id', { ascending: false })
    .limit(limit)
  if (error) throw dataError('No se pudieron leer las entradas', error)
  return parseMany(eventSchema, data as unknown[], 'entrada')
}

/** null si el ESP32 aún no ha consultado ni hay tarjetas. */
export async function fetchSync(deviceId: string): Promise<AccessSync | null> {
  const { data, error } = await getSupabase()
    .from('rfid_sync')
    .select('cards_version, mega_version, checked_at')
    .eq('device_id', deviceId)
    .maybeSingle()
  if (error) throw dataError('No se pudo leer la sincronización', error)
  return data ? parseOne(syncSchema, data, 'sincronización') : null
}

/** Mensajes de las RPC de tarjetas (rol, únicos, límite del Mega) en palabras del usuario. */
function cardError(context: string, error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error('Esa tarjeta ya está registrada.')
  if (error.code === '42501') return new Error('Solo el administrador puede cambiar las tarjetas.')
  if (error.message.includes('max_cards'))
    return new Error('El Mega guarda hasta 20 tarjetas activas. Desactiva o borra alguna primero.')
  if (error.message.includes('unknown_card')) return new Error('La tarjeta ya no existe.')
  if (error.code === '23514')
    return new Error('El UID debe tener 8, 14 o 20 dígitos (4, 7 o 10 bytes).')
  return dataError(context, error)
}

/** Las tarjetas solo se cambian por RPC (solo admin; cada cambio queda en la bitácora). */
export async function addCard(deviceId: string, uid: string, holder: string): Promise<void> {
  const { error } = await getSupabase().rpc('rfid_add_card', {
    p_device_id: deviceId,
    p_uid: uid,
    p_holder: holder,
  })
  if (error) throw cardError('No se pudo agregar la tarjeta', error)
}

export async function setCardActive(id: number, active: boolean): Promise<void> {
  const { error } = await getSupabase().rpc('rfid_set_card_active', {
    p_card_id: id,
    p_active: active,
  })
  if (error) throw cardError('No se pudo cambiar la tarjeta', error)
}

export async function deleteCard(id: number): Promise<void> {
  const { error } = await getSupabase().rpc('rfid_delete_card', { p_card_id: id })
  if (error) throw cardError('No se pudo borrar la tarjeta', error)
}

interface AccessHandlers {
  onEvent: (row: AccessEvent) => void
  /** Cambió la lista de tarjetas o su sincronización: volver a leer. */
  onListChange: () => void
  onResync: () => void
}

let channelSeq = 0

/** Realtime: intentos nuevos en el lector, cambios de tarjetas y confirmaciones del Mega. */
export function subscribeToAccess(deviceId: string, handlers: AccessHandlers): () => void {
  const supabase = getSupabase()
  const filter = `device_id=eq.${deviceId}`
  let subscribedBefore = false
  const channel = supabase
    .channel(`access:${deviceId}:${++channelSeq}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'rfid_events', filter },
      (p) => {
        const row = toAccessEvent(p.new)
        if (row) handlers.onEvent(row)
      },
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rfid_cards', filter }, () =>
      handlers.onListChange(),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rfid_sync', filter }, () =>
      handlers.onListChange(),
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        if (subscribedBefore) handlers.onResync()
        subscribedBefore = true
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[tiempo real] canal de accesos: ${status}`, err?.message ?? '')
      }
    })
  return () => {
    void supabase.removeChannel(channel)
  }
}

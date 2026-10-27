import { z } from 'zod'

/** UID de tarjeta RFID en hex mayúsculas: 4, 7 o 10 bytes. */
export const rfidUidSchema = z.string().regex(/^([0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$/)

export const MAX_RFID_CARDS = 20

// Mega → ESP32 (Serial1, JSON por línea). Nunca llegan a device_ingest.
/** Intento en el lector; `ok` es lo que decidió el Mega. ESP32 → `device_rfid_event`. */
export const rfidEventSchema = z
  .object({ rfid: rfidUidSchema, ok: z.union([z.literal(0), z.literal(1)]) })
  .strict()
export type RfidEvent = z.infer<typeof rfidEventSchema>

/** Respuesta a `@CARDS?` y a `@END`: versión de la lista que guardó (o rechazó) el Mega. */
export const cardsReplySchema = z.union([
  z
    .object({
      cards: z.number().int().nonnegative(),
      ok: z.literal(1),
      n: z.number().int().min(0).max(MAX_RFID_CARDS),
    })
    .strict(),
  z.object({ cards: z.number().int().nonnegative(), ok: z.literal(0) }).strict(),
])
export type CardsReply = z.infer<typeof cardsReplySchema>

// ESP32 → Mega (texto, sin #id ni ACK de comandos):
//   @CARDS?   ·   @CARDS <ver> <n>   ·   @CARD <uid> [nombre ≤10, sin espacios]   ·   @END <ver>

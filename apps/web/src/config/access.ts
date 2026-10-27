/** Control de acceso RFID: el Mega guarda hasta 20 tarjetas activas en su EEPROM. */
export const MAX_ACTIVE_CARDS = 20
export const ACCESS_EVENTS_LIMIT = 50
/** El ESP32 revisa la lista cada 30 s; si no consulta en 2 min, se considera sin conexión. */
export const ACCESS_SYNC_STALE_MS = 120_000

/** "53 d8-01:51" → "53D801 51…": solo dígitos hex en mayúsculas. */
export function normalizeUid(raw: string): string {
  return raw.replace(/[^0-9a-f]/gi, '').toUpperCase()
}

/** UID válido: 4, 7 o 10 bytes (8, 14 o 20 dígitos hex), como los acepta el Mega. */
export function isValidUid(uid: string): boolean {
  return /^([0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$/.test(uid)
}

/** "53D80151220001" → "53 D8 01 51 22 00 01" (como lo imprime el lector). */
export function formatUid(uid: string): string {
  return uid.match(/.{1,2}/g)?.join(' ') ?? uid
}

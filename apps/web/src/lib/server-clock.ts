/**
 * Q-34: "dato viejo" y la cuenta regresiva del modo manual se miden con la hora del servidor, no con el
 * reloj del celular. El desfase se estima con `v_device_status` (last_seen_at + seconds_since_seen).
 */
const MIN_CHANGE_MS = 1500

let offsetMs = 0

/** Hora del servidor estimada (ms epoch). */
export function serverNow(): number {
  return Date.now() - offsetMs
}

/** Ajusta el desfase; ignora variaciones menores a 1,5 s (precisión de segundos + latencia). */
export function syncServerClock(serverNowMs: number): void {
  const next = Date.now() - serverNowMs
  if (Number.isFinite(next) && Math.abs(next - offsetMs) > MIN_CHANGE_MS) offsetMs = next
}

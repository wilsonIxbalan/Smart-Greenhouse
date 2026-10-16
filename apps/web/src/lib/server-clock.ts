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

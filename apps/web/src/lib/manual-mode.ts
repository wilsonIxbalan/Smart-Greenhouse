import type { Actuator } from '@inv/contracts'
import type { Reading } from '@/lib/supabase/types'

/**
 * Segundos de modo manual que quedan ahora: `man` de la trama menos lo transcurrido desde que llegó
 * (ambos en hora del servidor). null = el actuador está en automático según la última trama.
 */
export function manualRemainingS(reading: Reading, act: Actuator, now: number): number | null {
  const atFrame = reading.frame.man[act]
  if (atFrame === undefined) return null
  return Math.max(0, Math.round(atFrame - (now - reading.receivedAt) / 1000))
}

/** 582 → "9:42". */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

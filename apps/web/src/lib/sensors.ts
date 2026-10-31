import type { SoilAptitude, Telemetry } from '@inv/contracts'
import { ADC, STALE_AFTER_MS } from '@/config/thresholds'

const clampCount = (adc: number) => Math.min(ADC.maxCount, Math.max(0, adc))

/** Cuenta ADC de 10 bits → voltaje en el pin: V = ADC · Vref / 1023. */
export function adcToVolts(adc: number, vref: number = ADC.vref): number {
  return (clampCount(adc) * vref) / ADC.maxCount
}

/** Cuenta ADC → porcentaje de escala completa (0–100). */
export function adcToPercent(adc: number): number {
  return (clampCount(adc) / ADC.maxCount) * 100
}

/** BR-S01/S02: verdadero si la lectura tiene más de `maxAgeMs` o no existe. */
export function isStale(
  receivedAt: number | null | undefined,
  now: number,
  maxAgeMs: number = STALE_AFTER_MS,
): boolean {
  if (receivedAt === null || receivedAt === undefined) return true
  return now - receivedAt > maxAgeMs
}

/** Veredicto del Mega (él decide la aptitud). Sin lectura o sensor en falla → SIN_LECTURA. */ export function soilVerdict(
  f: Pick<Telemetry, 'suelo_ok' | 'aptitud'>,
): SoilAptitude {
  return f.suelo_ok === 1 ? (f.aptitud ?? 'SIN_LECTURA') : 'SIN_LECTURA'
}

/** "hace X" en español para una antigüedad en milisegundos. */
export function formatAge(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `hace ${s} s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

/** Duración legible: "12 min", "2 h 5 min". */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'menos de 1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return min % 60 ? `${h} h ${min % 60} min` : `${h} h`
}

/** El más reciente de dos instantes (trama en caché vs `last_seen_at`); null si no hay ninguno. */
export function latestTimestamp(
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null) return b ?? null
  return b == null ? a : Math.max(a, b)
}

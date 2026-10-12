import type { SoilAptitude } from '@inv/contracts'
import { ADC, SOIL_PH, STALE_AFTER_MS } from '@/config/thresholds'

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

/** Veredicto de aptitud por pH. Sin lectura (o sensor en falla) → SIN_LECTURA. */
export function soilVerdict(ph: number | null | undefined): SoilAptitude {
  if (ph === null || ph === undefined || Number.isNaN(ph)) return 'SIN_LECTURA'
  if (ph >= SOIL_PH.apt.min && ph <= SOIL_PH.apt.max) return 'APTO'
  if (ph >= SOIL_PH.regular.min && ph <= SOIL_PH.regular.max) return 'REGULAR'
  return 'NO_APTO'
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

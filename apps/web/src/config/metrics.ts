import type { SoilAptitude, Telemetry } from '@inv/contracts'
import type { StatusTone } from '@/components/shared/StatusChip'
import { THRESHOLDS } from '@/config/thresholds'
import type { InfoKey } from '@/content/electronics/types'
import type { HistoryColumn } from '@/lib/supabase/types'
import { adcToVolts, soilVerdict } from '@/lib/sensors'

export type MetricTone = 'primary' | 'water' | 'copper' | 'warning' | 'critical'
export type MetricAvailability = 'ok' | 'no-reading' | 'no-sensor'

export interface MetricDetail {
  label: string
  value: string
}

export interface MetricDef {
  key: string
  label: string
  unit: string
  tone: MetricTone
  infoKey: InfoKey
  decimals: number
  /** Valor mostrado; null si no hay lectura válida (nunca un 0 inventado). */
  select: (f: Telemetry) => number | null
  availability?: (f: Telemetry) => MetricAvailability
  threshold?: { value: number; label: string }
  alert?: (f: Telemetry) => boolean
  secondary?: (f: Telemetry) => string
  details?: (f: Telemetry) => MetricDetail[]
  badge?: (f: Telemetry) => { tone: StatusTone; label: string }
  note?: string
  /** Columna de `reading_history`: si existe, la métrica aparece en la gráfica de 24 h. */
  historyColumn?: HistoryColumn
}

const dht = (f: Telemetry): MetricAvailability => (f.dht_ok ? 'ok' : 'no-reading')
const soil7 = (f: Telemetry): MetricAvailability => (f.suelo_ok ? 'ok' : 'no-reading')
const volts = (adc: number) => `${adcToVolts(adc).toFixed(2)} V en el pin`
const opt = (x: number | undefined) => (x === undefined ? '—' : String(x))

const APTITUDE_BADGE: Record<SoilAptitude, { tone: StatusTone; label: string }> = {
  APTO: { tone: 'ok', label: 'Apto' },
  REGULAR: { tone: 'warning', label: 'Regular' },
  NO_APTO: { tone: 'critical', label: 'No apto' },
  SIN_LECTURA: { tone: 'neutral', label: 'Sin lectura' },
}

export const METRICS = [
  {
    key: 'airTemp',
    label: 'Temperatura del aire',
    unit: '°C',
    tone: 'copper',
    infoKey: 'air-climate',
    decimals: 1,
    select: (f) => (f.dht_ok ? f.aire_t : null),
    availability: dht,
    threshold: { value: THRESHOLDS.airTempMaxC, label: 'Ventilar' },
    alert: (f) => f.dht_ok === 1 && f.aire_t > THRESHOLDS.airTempMaxC,
    historyColumn: 'aire_t',
  },
  {
    key: 'airHumidity',
    label: 'Humedad del aire',
    unit: '%',
    tone: 'water',
    infoKey: 'air-climate',
    decimals: 0,
    select: (f) => (f.dht_ok ? f.aire_h : null),
    availability: dht,
    threshold: { value: THRESHOLDS.airHumidityMax, label: 'Ventilar' },
    alert: (f) => f.dht_ok === 1 && f.aire_h > THRESHOLDS.airHumidityMax,
    historyColumn: 'aire_h',
  },
  {
    key: 'soilHumidity',
    label: 'Humedad de suelo',
    unit: '%',
    tone: 'water',
    infoKey: 'soil-moisture',
    decimals: 0,
    select: (f) => f.suelo_h,
    // con USA_7EN1 = 1 la humedad de suelo viene del 7-en-1 (reg1), no del capacitivo
    availability: soil7,
    threshold: { value: THRESHOLDS.soilIrrigateOn, label: 'Regar' },
    alert: (f) => f.suelo_ok === 1 && f.suelo_h < THRESHOLDS.soilIrrigateOn,
    secondary: (f) => (f.bomba ? 'Regando' : `Riego bajo ${THRESHOLDS.soilIrrigateOn} %`),
    historyColumn: 'suelo_h',
  },
  {
    key: 'light',
    label: 'Luz',
    unit: 'lx',
    tone: 'warning',
    infoKey: 'light',
    decimals: 0,
    select: (f) => (f.lux < 0 ? null : f.lux),
    availability: (f) => (f.lux < 0 ? 'no-sensor' : 'ok'),
    threshold: { value: THRESHOLDS.lightMinLux, label: 'Encender luz' },
    secondary: (f) => (f.luz > 0 ? `Luz artificial ${f.luz} %` : 'Luz artificial apagada'),
    historyColumn: 'lux',
  },
  {
    key: 'mq135',
    label: 'Calidad del aire (MQ-135)',
    unit: 'ADC',
    tone: 'primary',
    infoKey: 'air-quality',
    decimals: 0,
    select: (f) => f.aire_mq135,
    threshold: { value: THRESHOLDS.mq135MaxAdc, label: 'Aire malo' },
    alert: (f) => f.aire_mq135 > THRESHOLDS.mq135MaxAdc,
    secondary: (f) => volts(f.aire_mq135),
    historyColumn: 'aire_mq135',
  },
  {
    key: 'mq7',
    label: 'Monóxido de carbono (MQ-7)',
    unit: 'ADC',
    tone: 'critical',
    infoKey: 'air-quality',
    decimals: 0,
    select: (f) => f.co,
    threshold: { value: THRESHOLDS.mq7MaxAdc, label: 'CO alto' },
    alert: (f) => f.co > THRESHOLDS.mq7MaxAdc,
    secondary: (f) => volts(f.co),
    historyColumn: 'co',
  },
  {
    key: 'soilPh',
    label: 'Suelo 7 en 1 · pH aprox.',
    unit: 'pH',
    tone: 'primary',
    infoKey: 'soil-7in1',
    decimals: 1,
    select: (f) => (f.suelo_ok && f.ph !== undefined ? f.ph : null),
    availability: soil7,
    badge: (f) => APTITUDE_BADGE[soilVerdict(f)],
    details: (f) => [
      { label: 'EC', value: `${opt(f.ec)} µS/cm` },
      { label: 'N', value: `${opt(f.n)} mg/kg` },
      { label: 'P', value: `${opt(f.p)} mg/kg` },
      { label: 'K', value: `${opt(f.k)} mg/kg` },
    ],
    note: 'pH aproximado sin calibrar (registro 7 del sensor). NPK orientativo: el sensor lo estima a partir de la conductividad.',
  },
] as const satisfies readonly MetricDef[]

export type MetricKey = (typeof METRICS)[number]['key']

import { CONTRACT_VERSION, type SoilAptitude, type Telemetry } from './telemetry.ts'

export type Scenario = 'normal' | 'co_alto' | 'sin_agua' | 'falla_suelo'

export interface GeneratorOptions {
  scenario?: Scenario
  /** Segundo del día (hora local) en t = 0. Por defecto 06:00. */
  startOfDayS?: number
  /** false emula el firmware con USA_BH1750 = 0 (lux = -1). */
  lightSensor?: boolean
}

// Umbrales del firmware de referencia (Firmware_Invernadero_Mega.ino)
const U = { riegoOn: 30, riegoOff: 60, temp: 30, hum: 80, luz: 200, mq135: 270, mq7: 160 } as const
const DAY_S = 86_400
const DRY_CYCLE_S = 7_200
const PUMP_S = 240

function noise(seed: number, i: number): number {
  // hash entero determinista → [-1, 1]
  let h = (seed ^ Math.imul(i, 0x9e3779b1)) >>> 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 0x7fffffff - 1
}

const round = (x: number, d = 0) => Math.round(x * 10 ** d) / 10 ** d
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

function aptitude(ph: number): SoilAptitude {
  if (ph >= 6.0 && ph <= 7.5) return 'APTO'
  if (ph >= 5.5 && ph <= 8.0) return 'REGULAR'
  return 'NO_APTO'
}

/**
 * Trama determinista para el segundo `t` desde el arranque: ciclo día/noche, secado del suelo
 * con riego por histéresis y la misma lógica de actuadores del firmware.
 */
export function generateTelemetry(seed: number, t: number, opts: GeneratorOptions = {}): Telemetry {
  const { scenario = 'normal', startOfDayS = 6 * 3600, lightSensor = true } = opts
  const step = Math.floor(t / 2)
  const n = (k: number) => noise(seed + k, step)

  const dayPhase = (((startOfDayS + t) % DAY_S) / DAY_S) * 2 * Math.PI
  const daylight = Math.max(0, -Math.cos(dayPhase))

  const aireT = round(clamp(22 + 11 * daylight + n(1) * 0.4, -40, 80), 1)
  const aireH = round(clamp(78 - 25 * daylight + n(2) * 1.5, 0, 100))
  const lux = lightSensor
    ? Math.round(clamp(20 + 900 * daylight * (1 + n(3) * 0.05), 0, 65535))
    : -1

  const hasWater = scenario !== 'sin_agua'
  const cyclePos = t % (DRY_CYCLE_S + PUMP_S)
  const pumping = hasWater && cyclePos >= DRY_CYCLE_S
  const drying = Math.min(cyclePos, DRY_CYCLE_S) / DRY_CYCLE_S
  const sueloH = hasWater
    ? pumping
      ? U.riegoOn + ((cyclePos - DRY_CYCLE_S) / PUMP_S) * (U.riegoOff - U.riegoOn + 2)
      : U.riegoOff + 2 - drying * (U.riegoOff - U.riegoOn + 4)
    : clamp(U.riegoOn - 4 - t / 3600, 5, 100)

  const sueloOk = scenario !== 'falla_suelo'
  const ph = round(6.4 + n(4) * 0.05, 1)
  const aire = Math.round(clamp(180 + 20 * n(5) + (scenario === 'co_alto' ? 140 : 0), 0, 1023))
  const co = Math.round(clamp(90 + 10 * n(6) + (scenario === 'co_alto' ? 120 : 0), 0, 1023))

  const ventilar = aireT > U.temp || aireH > U.hum
  const gasMalo = aire > U.mq135 || co > U.mq7

  return {
    v: CONTRACT_VERSION,
    seq: step,
    up: Math.floor(t),
    aire_t: aireT,
    aire_h: aireH,
    dht_ok: 1,
    suelo_h: round(clamp(sueloH + n(7) * 0.5, 0, 100)),
    suelo_t: round(20 + 5 * daylight + n(8) * 0.2, 1),
    ph,
    ec: Math.round(1200 + 80 * n(9)),
    n: Math.round(34 + 2 * n(10)),
    p: Math.round(12 + n(11)),
    k: Math.round(40 + 2 * n(12)),
    suelo_ok: sueloOk ? 1 : 0,
    aptitud: sueloOk ? aptitude(ph) : 'SIN_LECTURA',
    lux,
    aire_mq135: aire,
    co,
    agua: hasWater ? 1 : 0,
    pir: 0,
    bomba: pumping && sueloOk ? 1 : 0,
    vent: ventilar || gasMalo ? 1 : 0,
    luz: lux >= 0 && lux < U.luz ? 78 : 0,
    ventana: ventilar ? 90 : 0,
    puerta: 0,
    alarma: gasMalo ? 1 : 0,
    man: {},
  }
}

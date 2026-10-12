/** Umbrales del firmware de referencia (se moverán a la base de datos en B5). */
export const THRESHOLDS = {
  airTempMaxC: 30,
  airHumidityMax: 80,
  soilIrrigateOn: 30,
  soilIrrigateOff: 60,
  lightMinLux: 200,
  mq135MaxAdc: 270,
  mq7MaxAdc: 160,
} as const

/** Rangos de pH para el veredicto de aptitud del suelo. */
export const SOIL_PH = {
  apt: { min: 6.0, max: 7.5 },
  regular: { min: 5.5, max: 8.0 },
} as const

/** Electrónica del Mega: ADC de 10 bits referido a 5 V. */
export const ADC = { maxCount: 1023, vref: 5 } as const

/** BR-S01/S02: una lectura con más de 30 s se considera vieja / dispositivo sin conexión. */
export const STALE_AFTER_MS = 30_000

export const TIMING = {
  frameIntervalMs: 2_000,
  historyStepMs: 5 * 60_000,
  historyRangeMs: { '24h': 24 * 3_600_000 },
  mockAckDelayMs: 800,
  commandTimeoutMs: 10_000,
  clockTickMs: 1_000,
} as const

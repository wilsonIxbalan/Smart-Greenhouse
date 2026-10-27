/** Umbrales del Mega (calibrados por el equipo, 25 oct). Igualar a mano con la tabla `thresholds`. */
export const THRESHOLDS = {
  airTempMaxC: 30,
  airHumidityMax: 80,
  soilIrrigateOn: 30,
  soilIrrigateOff: 60,
  lightMinLux: 100,
  mq135MaxAdc: 180,
  mq7MaxAdc: 270,
} as const

/** Rangos de pH para el veredicto de aptitud del suelo. */
export const SOIL_PH = {
  apt: { min: 6.0, max: 7.5 },
  regular: { min: 5.5, max: 8.0 },
} as const

/** Electrónica del Mega: ADC de 10 bits referido a 5 V. */
export const ADC = { maxCount: 1023, vref: 5 } as const

/** BR-S01/S02: la trama llega cada ~10 s (Q-31); más de 30 s sin datos = dato viejo / sin conexión. */
export const STALE_AFTER_MS = 30_000

export const TIMING = {
  /** Gráfica: `reading_history` promedia por bloques; la API devuelve máx. 1000 filas. */
  history: { hours: 24, bucketMinutes: 5, refetchMs: 5 * 60_000 },
  deviceStatusRefetchMs: 60_000,
  requestTimeoutMs: 15_000,
  clockTickMs: 1_000,
  /** Comandos: respaldo de consulta mientras uno espera ACK, ventana visible y vida del aviso final. */
  command: { pollMs: 3_000, windowMinutes: 10, feedbackMs: 2 * 60_000 },
} as const

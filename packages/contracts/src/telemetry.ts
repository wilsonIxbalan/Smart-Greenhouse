import { z } from 'zod'

export const CONTRACT_VERSION = 1 as const
export const MAX_FRAME_BYTES = 512

const adc = z.number().int().min(0).max(1023)
const flag = z.union([z.literal(0), z.literal(1)])

export const ACTUATORS = ['bomba', 'vent', 'luz', 'ventana', 'puerta', 'alarma'] as const
export const actuatorSchema = z.enum(ACTUATORS)
export type Actuator = z.infer<typeof actuatorSchema>

export const SOIL_APTITUDES = ['APTO', 'REGULAR', 'NO_APTO', 'SIN_LECTURA'] as const
export const soilAptitudeSchema = z.enum(SOIL_APTITUDES)
export type SoilAptitude = z.infer<typeof soilAptitudeSchema>

// Trama plana que emite el Mega cada 2 s por Serial1 (ALINEACION §4). Rangos según BR-D03.
export const telemetrySchema = z
  .object({
    v: z.literal(CONTRACT_VERSION),
    seq: z.number().int().nonnegative(),
    up: z.number().int().nonnegative(),
    aire_t: z.number().min(-40).max(80),
    aire_h: z.number().min(0).max(100),
    dht_ok: flag,
    suelo_h: z.number().min(0).max(100),
    suelo_t: z.number().min(-40).max(80).optional(),
    ph: z.number().min(0).max(14).optional(),
    ec: z.number().int().nonnegative().optional(),
    n: z.number().int().nonnegative().optional(),
    p: z.number().int().nonnegative().optional(),
    k: z.number().int().nonnegative().optional(),
    suelo_ok: flag,
    aptitud: soilAptitudeSchema.optional(),
    lux: z.number().int().min(-1).max(65535),
    aire_mq135: adc,
    co: adc,
    agua: flag,
    pir: flag,
    bomba: flag,
    vent: flag,
    luz: z.number().int().min(0).max(100),
    ventana: z.number().int().min(0).max(90),
    puerta: z.number().int().min(0).max(90),
    alarma: flag,
    man: z.partialRecord(actuatorSchema, z.number().int().min(0).max(3600)),
  })
  .strict()

export type Telemetry = z.infer<typeof telemetrySchema>

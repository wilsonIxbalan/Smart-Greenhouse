import { z } from 'zod'
import { getSupabase } from './client'
import { dataError, pgNumber, timestampSchema } from './parse'
import { HOURLY_COLUMNS, type HourlyColumn, type HourlyPoint } from './types'

const nullableNumber = pgNumber.nullable()
const hourlyShape = Object.fromEntries(HOURLY_COLUMNS.map((c) => [c, nullableNumber])) as Record<
  HourlyColumn,
  typeof nullableNumber
>
const hourlyRowSchema = z.object({ hour: timestampSchema, samples: pgNumber, ...hourlyShape })

/** Agregados por hora desde `fromMs` (30 días = 720 filas, bajo el límite de 1 000 de la API). */
export async function fetchHourly(deviceId: string, fromMs: number): Promise<HourlyPoint[]> {
  const { data, error } = await getSupabase()
    .from('readings_hourly')
    .select(['hour', 'samples', ...HOURLY_COLUMNS].join(', '))
    .eq('device_id', deviceId)
    .gte('hour', new Date(fromMs).toISOString())
    .order('hour', { ascending: true })
    .limit(1000)
  if (error) throw dataError('No se pudieron leer los datos por hora', error)
  const parsed = z.array(hourlyRowSchema).safeParse(data)
  if (!parsed.success) {
    throw dataError('Los datos por hora llegaron con un formato inesperado', {
      message: z.prettifyError(parsed.error),
    })
  }
  return parsed.data.map(({ hour, ...rest }) => ({ t: hour, ...rest }))
}

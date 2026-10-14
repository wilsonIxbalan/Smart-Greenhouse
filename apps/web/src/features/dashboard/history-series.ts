import type { HistoryColumn, HistoryPoint } from '@/lib/supabase/types'

export interface ChartPoint {
  t: number
  v: number | null
}

/** Un hueco mayor a 1,5 bloques significa que el dispositivo no envió datos en ese lapso. */
const GAP_FACTOR = 1.5

/** Serie de una columna; inserta null en los huecos para cortar la línea en vez de inventar un tramo. */
export function toChartSeries(
  points: readonly HistoryPoint[],
  column: HistoryColumn,
  bucketMs: number,
): ChartPoint[] {
  const out: ChartPoint[] = []
  let prevT: number | null = null
  for (const p of points) {
    if (prevT !== null && p.t - prevT > bucketMs * GAP_FACTOR) {
      out.push({ t: prevT + bucketMs, v: null })
    }
    out.push({ t: p.t, v: p[column] })
    prevT = p.t
  }
  return out
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useDataSource, type HistoryRange, type Reading } from '@/lib/data-source'

export const queryKeys = {
  latest: ['reading', 'latest'] as const,
  history: (range: HistoryRange) => ['reading', 'history', range] as const,
  device: ['device', 'status'] as const,
}

/** Última lectura; se mantiene viva con la suscripción de la fuente de datos. */
export function useLatestReading() {
  const ds = useDataSource()
  const qc = useQueryClient()
  useEffect(
    () =>
      ds.subscribe((reading) => {
        qc.setQueryData<Reading | null>(queryKeys.latest, reading)
        qc.setQueryData(queryKeys.device, { online: true, lastSeenAt: reading.receivedAt })
      }),
    [ds, qc],
  )
  return useQuery({ queryKey: queryKeys.latest, queryFn: () => ds.getLatest() })
}

export function useHistory(range: HistoryRange = '24h') {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.history(range), queryFn: () => ds.getHistory(range) })
}

export function useDeviceStatus() {
  const ds = useDataSource()
  return useQuery({ queryKey: queryKeys.device, queryFn: () => ds.getDeviceStatus() })
}

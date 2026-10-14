import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { DEVICE_ID } from '@/config/device'
import { TIMING } from '@/config/thresholds'
import { fetchDeviceStatus } from '@/lib/supabase/device'
import { fetchHistory, fetchLatestReading, subscribeToReadings } from '@/lib/supabase/readings'
import type { DeviceStatus, Reading } from '@/lib/supabase/types'

const { hours, bucketMinutes, refetchMs } = TIMING.history

export const queryKeys = {
  readings: ['reading'] as const,
  latest: (deviceId: string) => ['reading', 'latest', deviceId] as const,
  history: (deviceId: string) => ['reading', 'history', deviceId, hours, bucketMinutes] as const,
  device: (deviceId: string) => ['device', 'status', deviceId] as const,
}

/** Última lectura válida; la mantiene viva `useLiveReadings`. */
export function useLatestReading() {
  return useQuery({
    queryKey: queryKeys.latest(DEVICE_ID),
    queryFn: () => fetchLatestReading(DEVICE_ID),
  })
}

/** Promedios de las últimas 24 h; se refresca al cerrar cada bloque. */
export function useHistory() {
  return useQuery({
    queryKey: queryKeys.history(DEVICE_ID),
    queryFn: () => fetchHistory(DEVICE_ID, hours, bucketMinutes),
    staleTime: refetchMs,
    refetchInterval: refetchMs,
  })
}

export function useDeviceStatus() {
  return useQuery({
    queryKey: queryKeys.device(DEVICE_ID),
    queryFn: () => fetchDeviceStatus(DEVICE_ID),
    refetchInterval: TIMING.deviceStatusRefetchMs,
  })
}

/**
 * Suscripción Realtime a las tramas nuevas (una sola, montada en el layout autenticado):
 * actualiza la caché de la última lectura y del estado; al reconectar, vuelve a consultar.
 */
export function useLiveReadings() {
  const qc = useQueryClient()
  useEffect(
    () =>
      subscribeToReadings(DEVICE_ID, {
        onReading: (reading) => {
          qc.setQueryData<Reading | null>(queryKeys.latest(DEVICE_ID), (prev) =>
            prev && prev.receivedAt > reading.receivedAt ? prev : reading,
          )
          qc.setQueryData<DeviceStatus | null>(queryKeys.device(DEVICE_ID), (prev) =>
            prev
              ? {
                  ...prev,
                  online: true,
                  lastSeenAt: Math.max(prev.lastSeenAt ?? 0, reading.receivedAt),
                }
              : prev,
          )
        },
        onResync: () => {
          void qc.invalidateQueries({ queryKey: queryKeys.readings })
          void qc.invalidateQueries({ queryKey: queryKeys.device(DEVICE_ID) })
        },
      }),
    [qc],
  )
}

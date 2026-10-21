import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { ALERT_HISTORY_DAYS } from '@/config/alerts'
import { DEVICE_ID } from '@/config/device'
import { acknowledgeAlert, fetchAlerts, subscribeToAlerts } from '@/lib/supabase/alerts'
import type { AlertRow } from '@/lib/supabase/types'
import { serverNow } from '@/lib/server-clock'

const MAX_ROWS = 100

export const alertKeys = {
  list: (deviceId: string) => ['alerts', deviceId] as const,
}

export const isOpen = (a: AlertRow) => a.resolvedAt === null

/** Una alerta solo avanza (abierta → reconocida → resuelta): no se retrocede si Realtime llega tarde. */
const progress = (a: AlertRow) => (a.resolvedAt ? 2 : 0) + (a.acknowledgedAt ? 1 : 0)

function upsert(list: AlertRow[] | undefined, row: AlertRow): AlertRow[] {
  const prev = list?.find((a) => a.id === row.id)
  if (list && prev && progress(row) < progress(prev)) return list
  return [row, ...(list ?? []).filter((a) => a.id !== row.id)]
    .sort((a, b) => b.id - a.id)
    .slice(0, MAX_ROWS)
}

/** Abiertas + historial reciente en una sola consulta; la pantalla y el badge filtran en el cliente. */
export function useAlerts() {
  return useQuery({
    queryKey: alertKeys.list(DEVICE_ID),
    queryFn: () => fetchAlerts(DEVICE_ID, serverNow() - ALERT_HISTORY_DAYS * 24 * 3_600_000),
  })
}

/** Badge: cuántas abiertas y si alguna es crítica. */
export function useOpenAlertCount() {
  const { data } = useAlerts()
  const open = (data ?? []).filter(isOpen)
  return { count: open.length, critical: open.some((a) => a.severity === 'critical') }
}

/** Realtime de `alerts` (montado una vez en el layout). */
export function useLiveAlerts() {
  const qc = useQueryClient()
  useEffect(
    () =>
      subscribeToAlerts(DEVICE_ID, {
        onChange: (row) =>
          qc.setQueryData<AlertRow[]>(alertKeys.list(DEVICE_ID), (list) => upsert(list, row)),
        onResync: () => void qc.invalidateQueries({ queryKey: alertKeys.list(DEVICE_ID) }),
      }),
    [qc],
  )
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: (row) =>
      qc.setQueryData<AlertRow[]>(alertKeys.list(DEVICE_ID), (list) => upsert(list, row)),
    onError: (error) => toast.error(error.message),
  })
}

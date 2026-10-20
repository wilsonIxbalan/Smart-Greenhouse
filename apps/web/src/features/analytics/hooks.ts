import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ANALYTICS_MAX_ALERTS,
  ANALYTICS_REFETCH_MS,
  type RangeDef,
  type RangeKey,
} from '@/config/analytics'
import { DEVICE_ID } from '@/config/device'
import { fetchAlertsCreatedSince } from '@/lib/supabase/alerts'
import { fetchHourly } from '@/lib/supabase/analytics'
import { sendReport } from '@/lib/supabase/reports'
import type { AlertRow, HourlyPoint } from '@/lib/supabase/types'
import { serverNow } from '@/lib/server-clock'
import { rangeStart } from './kpis'

export interface RangeData {
  from: number
  to: number
  points: HourlyPoint[]
  alerts: AlertRow[]
}

async function fetchRangeData(range: RangeDef): Promise<RangeData> {
  const to = serverNow()
  const from = rangeStart(range.hours, to)
  const [points, alerts] = await Promise.all([
    fetchHourly(DEVICE_ID, from),
    fetchAlertsCreatedSince(DEVICE_ID, from, ANALYTICS_MAX_ALERTS),
  ])
  return { from, to, points, alerts }
}

/** Agregados por hora + alertas del periodo; se refresca al ritmo del job que los calcula. */
export function useRangeData(range: RangeDef) {
  return useQuery({
    queryKey: ['analytics', DEVICE_ID, range.key] as const,
    queryFn: () => fetchRangeData(range),
    staleTime: ANALYTICS_REFETCH_MS,
    refetchInterval: ANALYTICS_REFETCH_MS,
  })
}

export function useSendReport() {
  return useMutation({
    mutationFn: ({ range, pdf }: { range: RangeKey; pdf: Blob }) => sendReport(range, pdf),
    onSuccess: ({ recipients }) =>
      toast.success(
        recipients === 1
          ? 'Reporte enviado por correo.'
          : `Reporte enviado a ${recipients} correos.`,
      ),
    onError: (error) => toast.error(error.message),
  })
}

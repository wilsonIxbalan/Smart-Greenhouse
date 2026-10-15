import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { DEVICE_ID } from '@/config/device'
import { TIMING } from '@/config/thresholds'
import { fetchRecentCommands, issueCommand, subscribeToCommands } from '@/lib/supabase/commands'
import type { CommandRequest, CommandRow, CommandStatus } from '@/lib/supabase/types'
import { serverNow } from '@/lib/server-clock'

const { pollMs, windowMinutes } = TIMING.command
const MAX_ROWS = 50

export const commandKeys = {
  recent: (deviceId: string) => ['commands', deviceId] as const,
}

export const isInFlight = (c: CommandRow) => c.status === 'pending' || c.status === 'sent'

const RANK: Record<CommandStatus, number> = { pending: 0, sent: 1, acked: 2, failed: 2, expired: 2 }

/** Inserta o actualiza un comando sin retroceder de estado (Realtime y la consulta pueden cruzarse). */
function upsert(list: CommandRow[] | undefined, row: CommandRow): CommandRow[] {
  const prev = list?.find((c) => c.id === row.id)
  if (list && prev && RANK[row.status] < RANK[prev.status]) return list
  return [row, ...(list ?? []).filter((c) => c.id !== row.id)]
    .sort((a, b) => b.id - a.id)
    .slice(0, MAX_ROWS)
}

/** Comandos de los últimos minutos; mientras alguno espera ACK se vuelve a consultar como respaldo. */
export function useCommands() {
  return useQuery({
    queryKey: commandKeys.recent(DEVICE_ID),
    queryFn: () => fetchRecentCommands(DEVICE_ID, serverNow() - windowMinutes * 60_000),
    refetchInterval: (query) => (query.state.data?.some(isInFlight) ? pollMs : false),
  })
}

/** Realtime de `commands` (montado una vez en el layout): un comando de otro celular también se ve. */
export function useLiveCommands() {
  const qc = useQueryClient()
  useEffect(
    () =>
      subscribeToCommands(DEVICE_ID, {
        onChange: (row) =>
          qc.setQueryData<CommandRow[]>(commandKeys.recent(DEVICE_ID), (list) => upsert(list, row)),
        onResync: () => void qc.invalidateQueries({ queryKey: commandKeys.recent(DEVICE_ID) }),
      }),
    [qc],
  )
}

export function useIssueCommand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: CommandRequest) => issueCommand(DEVICE_ID, req),
    onSuccess: (row) =>
      qc.setQueryData<CommandRow[]>(commandKeys.recent(DEVICE_ID), (list) => upsert(list, row)),
    onError: (error) => toast.error(error.message),
  })
}

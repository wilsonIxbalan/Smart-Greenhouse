import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { ACCESS_EVENTS_LIMIT } from '@/config/access'
import { DEVICE_ID } from '@/config/device'
import {
  addCard,
  deleteCard,
  fetchCards,
  fetchEvents,
  fetchSync,
  setCardActive,
  subscribeToAccess,
} from '@/lib/supabase/access'
import type { AccessEvent } from '@/lib/supabase/types'

export const accessKeys = {
  all: ['access', DEVICE_ID] as const,
  cards: ['access', DEVICE_ID, 'cards'] as const,
  events: ['access', DEVICE_ID, 'events'] as const,
  sync: ['access', DEVICE_ID, 'sync'] as const,
}

export function useAccessCards(enabled: boolean) {
  return useQuery({ queryKey: accessKeys.cards, queryFn: () => fetchCards(DEVICE_ID), enabled })
}

export function useAccessEvents(enabled: boolean) {
  return useQuery({
    queryKey: accessKeys.events,
    queryFn: () => fetchEvents(DEVICE_ID, ACCESS_EVENTS_LIMIT),
    enabled,
  })
}

export function useAccessSync(enabled: boolean) {
  return useQuery({ queryKey: accessKeys.sync, queryFn: () => fetchSync(DEVICE_ID), enabled })
}

/** Realtime de accesos, solo mientras la pantalla está abierta. */
export function useLiveAccess(enabled: boolean) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!enabled) return
    return subscribeToAccess(DEVICE_ID, {
      onEvent: (row) =>
        qc.setQueryData<AccessEvent[]>(accessKeys.events, (list) =>
          [row, ...(list ?? []).filter((e) => e.id !== row.id)].slice(0, ACCESS_EVENTS_LIMIT),
        ),
      onListChange: () => {
        void qc.invalidateQueries({ queryKey: accessKeys.cards })
        void qc.invalidateQueries({ queryKey: accessKeys.sync })
      },
      onResync: () => void qc.invalidateQueries({ queryKey: accessKeys.all }),
    })
  }, [qc, enabled])
}

function useCardMutation<V>(fn: (v: V) => Promise<void>, success: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success)
      void qc.invalidateQueries({ queryKey: accessKeys.cards })
      void qc.invalidateQueries({ queryKey: accessKeys.sync })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useAddCard = () =>
  useCardMutation(
    ({ uid, holder }: { uid: string; holder: string }) => addCard(DEVICE_ID, uid, holder),
    'Tarjeta agregada. El Mega la recibe en menos de 30 s.',
  )

export const useSetCardActive = () =>
  useCardMutation(
    ({ id, active }: { id: number; active: boolean }) => setCardActive(id, active),
    'Cambio guardado. El Mega lo recibe en menos de 30 s.',
  )

export const useDeleteCard = () =>
  useCardMutation((id: number) => deleteCard(id), 'Tarjeta borrada.')

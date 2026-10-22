import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { AUDIT_CATEGORIES, AUDIT_PAGE_SIZE, type AuditCategory } from '@/config/audit'
import {
  fetchAlertTypes,
  fetchAuditPage,
  fetchCommandOutcomes,
  fetchPeople,
} from '@/lib/supabase/audit'

const idsOf = (entries: { entity: string; entityId: string | null }[], entity: string) =>
  entries
    .filter((e) => e.entity === entity && e.entityId !== null)
    .map((e) => Number(e.entityId))
    .filter(Number.isFinite)

/** Bitácora paginada (50 por vez) con el estado de sus comandos y el tipo de sus alertas. */
export function useAuditLog(category: AuditCategory, enabled: boolean) {
  const { entities } = AUDIT_CATEGORIES.find((c) => c.key === category) ?? AUDIT_CATEGORIES[0]
  return useInfiniteQuery({
    queryKey: ['audit', category],
    enabled,
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const entries = await fetchAuditPage(entities, pageParam, AUDIT_PAGE_SIZE)
      const [commands, alerts] = await Promise.all([
        fetchCommandOutcomes(idsOf(entries, 'commands')),
        fetchAlertTypes(idsOf(entries, 'alerts')),
      ])
      return { entries, commands, alerts }
    },
    getNextPageParam: (last) =>
      last.entries.length < AUDIT_PAGE_SIZE ? null : (last.entries.at(-1)?.id ?? null),
  })
}

export function useAuditPeople(enabled: boolean) {
  return useQuery({ queryKey: ['audit-people'], queryFn: fetchPeople, enabled })
}

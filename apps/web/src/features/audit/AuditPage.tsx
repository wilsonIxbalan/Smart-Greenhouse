import { RefreshCw, ScrollText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AUDIT_CATEGORIES, type AuditCategory } from '@/config/audit'
import { usePermissions, useProfile } from '@/features/auth/hooks'
import type { AuditEntry } from '@/lib/supabase/types'
import { AuditItem, type AuditContext } from './AuditItem'
import { useAuditLog, useAuditPeople } from './hooks'

const dayFormat = new Intl.DateTimeFormat('es-GT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

function dayLabel(ms: number, today: Date): string {
  const d = new Date(ms)
  const days = Math.round(
    (new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000,
  )
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return dayFormat.format(d)
}

function groupByDay(entries: AuditEntry[]): { day: string; entries: AuditEntry[] }[] {
  const today = new Date()
  const groups: { day: string; entries: AuditEntry[] }[] = []
  for (const e of entries) {
    const day = dayLabel(e.createdAt, today)
    const last = groups.at(-1)
    if (last?.day === day) last.entries.push(e)
    else groups.push({ day, entries: [e] })
  }
  return groups
}

export function AuditPage() {
  const profile = useProfile()
  const { can } = usePermissions()
  const allowed = can('audit.view')
  const [category, setCategory] = useState<AuditCategory>('all')
  const log = useAuditLog(category, allowed)
  const people = useAuditPeople(allowed)

  const { groups, ctx } = useMemo(() => {
    const pages = log.data?.pages ?? []
    const merged: AuditContext = {
      people: people.data,
      commands: new Map(pages.flatMap((p) => [...p.commands])),
      alerts: new Map(pages.flatMap((p) => [...p.alerts])),
    }
    return { groups: groupByDay(pages.flatMap((p) => p.entries)), ctx: merged }
  }, [log.data, people.data])

  if (profile.isPending) return <Skeleton className="h-40 rounded-xl" />
  if (!allowed) return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold lg:text-2xl">Bitácora</h1>
          <p className="text-sm text-muted-foreground">
            Quién hizo qué: comandos, alertas reconocidas, reportes y cambios de usuarios, umbrales
            y destinos. Solo la ve el administrador.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Actualizar"
          disabled={log.isFetching}
          onClick={() => void log.refetch()}
        >
          <RefreshCw className={log.isFetching ? 'animate-spin' : undefined} />
        </Button>
      </div>

      <div role="radiogroup" aria-label="Filtro de la bitácora" className="flex flex-wrap gap-2">
        {AUDIT_CATEGORIES.map((c) => (
          <Button
            key={c.key}
            role="radio"
            aria-checked={category === c.key}
            variant={category === c.key ? 'default' : 'outline'}
            size="sm"
            className="min-h-11"
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {log.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : log.isError ? (
        <ErrorState
          title="No se pudo cargar la bitácora"
          description={log.error.message}
          onRetry={() => void log.refetch()}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Sin registros"
          description="Aquí aparecerá cada comando, alerta reconocida, reporte o cambio administrativo."
        />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.day} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground capitalize">{g.day}</h2>
              <Card className="gap-0 divide-y px-4 py-1">
                {g.entries.map((e) => (
                  <AuditItem key={e.id} entry={e} ctx={ctx} />
                ))}
              </Card>
            </section>
          ))}
          {log.hasNextPage && (
            <Button
              variant="outline"
              className="min-h-11 w-full"
              disabled={log.isFetchingNextPage}
              onClick={() => void log.fetchNextPage()}
            >
              {log.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

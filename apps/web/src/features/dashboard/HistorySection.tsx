import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { TIMING } from '@/config/thresholds'
import { HistoryChart } from '@/features/dashboard/HistoryChart'
import { useHistory } from '@/features/dashboard/hooks'

export function HistorySection() {
  const history = useHistory()
  const { hours, bucketMinutes } = TIMING.history

  return (
    <section className="min-w-0 space-y-3">
      <SectionHeader
        title={`Últimas ${hours} h`}
        description={`Promedio cada ${bucketMinutes} min · línea punteada: umbral de actuación`}
      />
      {history.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : history.isError ? (
        <ErrorState
          title="No se pudo cargar el historial"
          description={history.error.message}
          onRetry={() => void history.refetch()}
        />
      ) : history.data.length === 0 ? (
        <EmptyState
          title="Sin historial"
          description={`No hay lecturas guardadas en las últimas ${hours} h.`}
        />
      ) : (
        <HistoryChart points={history.data} bucketMs={bucketMinutes * 60_000} />
      )}
    </section>
  )
}

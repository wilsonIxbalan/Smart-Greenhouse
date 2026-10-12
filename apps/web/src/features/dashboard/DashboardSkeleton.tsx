import { Skeleton } from '@/components/ui/skeleton'
import { METRICS } from '@/config/metrics'

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando lecturas" className="space-y-4">
      <Skeleton className="h-6 w-56" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((m) => (
          <Skeleton key={m.key} className="h-36 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

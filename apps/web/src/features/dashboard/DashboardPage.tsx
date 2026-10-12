import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { SCENARIO_LABEL } from '@/config/demo'
import type { InfoKey } from '@/content/electronics/types'
import { ActuatorSummary } from '@/features/dashboard/ActuatorSummary'
import { AlertBanner } from '@/features/dashboard/AlertBanner'
import { DashboardSkeleton } from '@/features/dashboard/DashboardSkeleton'
import { DeviceStatusBar } from '@/features/dashboard/DeviceStatusBar'
import { HistoryChart } from '@/features/dashboard/HistoryChart'
import { useHistory, useLatestReading } from '@/features/dashboard/hooks'
import { MetricGrid } from '@/features/dashboard/MetricGrid'
import { InfoElectronicaDrawer } from '@/features/electronics/InfoElectronicaDrawer'
import { MockDataSource, useDataSource } from '@/lib/data-source'
import { formatAge, isStale } from '@/lib/sensors'
import { useNow } from '@/lib/use-now'

export function DashboardPage() {
  const ds = useDataSource()
  const latest = useLatestReading()
  const history = useHistory('24h')
  const now = useNow()
  const [infoKey, setInfoKey] = useState<InfoKey | null>(null)

  if (latest.isPending) return <DashboardSkeleton />
  if (latest.isError) {
    return (
      <ErrorState
        title="No se pudieron cargar las lecturas"
        description={latest.error.message}
        onRetry={() => void latest.refetch()}
      />
    )
  }
  const reading = latest.data
  if (!reading) {
    return (
      <EmptyState
        title="Aún no hay lecturas"
        description="El dispositivo no ha enviado ninguna trama todavía."
      />
    )
  }

  const stale = isStale(reading.receivedAt, now)
  const ageLabel = formatAge(now - reading.receivedAt)
  const demoLabel =
    ds instanceof MockDataSource ? `Simulación · ${SCENARIO_LABEL[ds.getScenario()]}` : undefined

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold lg:text-2xl">Dashboard</h1>
        <DeviceStatusBar
          online={!stale}
          lastSeenAt={reading.receivedAt}
          now={now}
          {...(demoLabel ? { demoLabel } : {})}
        />
        <AlertBanner frame={reading.frame} />
      </div>

      <section aria-labelledby="metrics-title" className="space-y-3">
        <h2 id="metrics-title" className="sr-only">
          Lecturas
        </h2>
        <MetricGrid frame={reading.frame} stale={stale} ageLabel={ageLabel} onInfo={setInfoKey} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="space-y-3">
          <SectionHeader title="Últimas 24 h" description="Línea punteada: umbral de actuación" />
          {history.isPending ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : history.isError ? (
            <ErrorState
              title="No se pudo cargar el historial"
              onRetry={() => void history.refetch()}
            />
          ) : history.data.length === 0 ? (
            <EmptyState title="Sin historial" description="Todavía no hay lecturas guardadas." />
          ) : (
            <HistoryChart history={history.data} />
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader title="Actuadores" description="Estado confirmado por el Mega" />
          <ActuatorSummary frame={reading.frame} />
        </section>
      </div>

      <InfoElectronicaDrawer
        infoKey={infoKey}
        frame={reading.frame}
        onClose={() => setInfoKey(null)}
      />
    </div>
  )
}

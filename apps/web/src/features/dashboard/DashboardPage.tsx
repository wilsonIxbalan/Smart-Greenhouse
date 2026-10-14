import { useState } from 'react'
import { ErrorState } from '@/components/shared/ErrorState'
import { SectionHeader } from '@/components/shared/SectionHeader'
import type { InfoKey } from '@/content/electronics/types'
import { ActuatorSummary } from '@/features/dashboard/ActuatorSummary'
import { AlertBanner } from '@/features/dashboard/AlertBanner'
import { DashboardSkeleton } from '@/features/dashboard/DashboardSkeleton'
import { DeviceStatusBar } from '@/features/dashboard/DeviceStatusBar'
import { HistorySection } from '@/features/dashboard/HistorySection'
import { useDeviceStatus, useLatestReading } from '@/features/dashboard/hooks'
import { MetricGrid } from '@/features/dashboard/MetricGrid'
import { NoReadingsState } from '@/features/dashboard/NoReadingsState'
import { InfoElectronicaDrawer } from '@/features/electronics/InfoElectronicaDrawer'
import { formatAge, isStale } from '@/lib/sensors'
import { useNow } from '@/lib/use-now'

const latestOf = (a: number | null | undefined, b: number | null | undefined) =>
  a == null ? (b ?? null) : b == null ? a : Math.max(a, b)

export function DashboardPage() {
  const latest = useLatestReading()
  const device = useDeviceStatus()
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
  const lastSeenAt = latestOf(reading?.receivedAt, device.data?.lastSeenAt)
  const online = !isStale(lastSeenAt, now)
  const statusBar = (
    <DeviceStatusBar
      online={online}
      lastSeenAt={lastSeenAt}
      now={now}
      {...(device.data ? { openAlerts: device.data.openAlerts } : {})}
    />
  )

  if (!reading) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-xl font-semibold lg:text-2xl">Dashboard</h1>
          {statusBar}
        </div>
        <NoReadingsState />
      </div>
    )
  }

  const stale = isStale(reading.receivedAt, now)
  const ageLabel = formatAge(now - reading.receivedAt)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold lg:text-2xl">Dashboard</h1>
        {statusBar}
        <AlertBanner frame={reading.frame} />
      </div>

      <section aria-labelledby="metrics-title" className="space-y-3">
        <h2 id="metrics-title" className="sr-only">
          Lecturas
        </h2>
        <MetricGrid frame={reading.frame} stale={stale} ageLabel={ageLabel} onInfo={setInfoKey} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <HistorySection />

        <section className="min-w-0 space-y-3">
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

import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import type { InfoKey } from '@/content/electronics/types'
import { useLatestReading } from '@/features/dashboard/hooks'
import { InfoElectronicaDrawer } from '@/features/electronics/InfoElectronicaDrawer'
import { ComponentCatalog } from '@/features/electronics-page/ComponentCatalog'
import { LawsSection } from '@/features/electronics-page/LawsSection'
import { LogicSimulator } from '@/features/electronics-page/LogicSimulator'
import { SignalPathSection } from '@/features/electronics-page/SignalPathSection'
import { SoilTruthTable } from '@/features/electronics-page/SoilTruthTable'

/** Las secciones estáticas se muestran siempre; las vivas usan la última lectura si existe. */
export function ElectronicsPage() {
  const latest = useLatestReading()
  const [infoKey, setInfoKey] = useState<InfoKey | null>(null)
  const frame = latest.data?.frame ?? null

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold lg:text-2xl">Electrónica</h1>
        <p className="text-sm text-muted-foreground">
          Cómo cada sensor se convierte en el dato que ves y cómo decide el Mega.
        </p>
        {latest.isPending ? (
          <Skeleton className="h-11 rounded-lg" data-testid="live-skeleton" />
        ) : latest.isError ? (
          <ErrorState
            title="No se pudo cargar la lectura en vivo"
            description={latest.error.message}
            onRetry={() => void latest.refetch()}
          />
        ) : !frame ? (
          <EmptyState
            title="Aún no hay lecturas"
            description="Las fórmulas y la vista lógica funcionan sin datos en vivo."
          />
        ) : null}
      </div>

      <SignalPathSection />
      <LawsSection frame={frame} />
      <ComponentCatalog onInfo={setInfoKey} />
      <LogicSimulator frame={frame} />
      <SoilTruthTable frame={frame} />

      <InfoElectronicaDrawer infoKey={infoKey} frame={frame} onClose={() => setInfoKey(null)} />
    </div>
  )
}

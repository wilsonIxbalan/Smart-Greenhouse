import { InfoElectronicaChip } from '@/components/shared/InfoElectronicaChip'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { StatusChip } from '@/components/shared/StatusChip'
import { HARDWARE_COMPONENTS, type HardwareComponent } from '@/config/components'
import type { InfoKey } from '@/content/electronics/types'

export function ComponentCatalog({ onInfo }: { onInfo: (key: InfoKey) => void }) {
  const items: readonly HardwareComponent[] = HARDWARE_COMPONENTS
  return (
    <section
      aria-label="Catálogo de componentes"
      data-testid="section-catalog"
      className="space-y-3"
    >
      <SectionHeader
        title="Catálogo de componentes"
        description="Según el mapa de pines del Mega."
      />
      <ul data-testid="component-grid" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => {
          const infoKey = c.infoKey
          return (
            <li key={c.key} className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="min-w-0 text-sm font-semibold break-words">{c.name}</h3>
                <span className="max-w-full shrink-0 rounded-md bg-copper/10 px-2 py-0.5 font-mono text-xs text-copper">
                  {c.pin}
                </span>
              </div>
              <p className="text-sm">{c.role}</p>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Interfaz</dt>
                <dd className="min-w-0 break-words">{c.iface}</dd>
                <dt className="text-muted-foreground">Principio</dt>
                <dd className="min-w-0 break-words">{c.principle}</dd>
              </dl>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                {c.status === 'pendiente' && <StatusChip tone="warning" label="Pendiente" />}
                {infoKey && <InfoElectronicaChip label={c.name} onClick={() => onInfo(infoKey)} />}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

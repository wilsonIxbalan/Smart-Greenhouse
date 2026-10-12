import type { Telemetry } from '@inv/contracts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ElectronicsInfo } from '@/content/electronics/types'
import { Tex } from '@/features/electronics/Tex'

interface InfoTabsProps {
  info: ElectronicsInfo
  frame: Telemetry | null
}

const TABS = [
  { value: 'component', label: 'Componente' },
  { value: 'principle', label: 'Principio' },
  { value: 'formula', label: 'Fórmula' },
  { value: 'signal', label: 'Señal' },
  { value: 'circuit', label: 'Circuito' },
] as const

export function InfoTabs({ info, frame }: InfoTabsProps) {
  const steps = frame ? info.formula.compute(frame) : null
  const c = info.component

  return (
    <Tabs defaultValue="component" className="min-h-0 gap-3">
      <TabsList className="w-full overflow-x-auto">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="min-h-11 text-xs">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="component" className="space-y-2 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          {(
            [
              ['Sensor', c.name],
              ['Modelo', c.model],
              ['Alimentación', c.supply],
              ['Interfaz', c.interface],
              ['Pines', c.pins],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-mono text-xs leading-5">{v}</dd>
            </div>
          ))}
        </dl>
        {c.notes && (
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {c.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="principle" className="space-y-2 text-sm">
        {info.principle.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </TabsContent>

      <TabsContent value="formula" className="space-y-3 text-sm">
        <div className="rounded-md border border-copper/30 p-3">
          <Tex tex={info.formula.general} display />
        </div>
        <ul className="space-y-1 text-xs">
          {info.formula.variables.map((v) => (
            <li key={v.symbol} className="flex gap-2">
              <Tex tex={v.symbol} />
              <span className="text-muted-foreground">{v.meaning}</span>
            </li>
          ))}
        </ul>
        <h4 className="font-medium">Con la lectura actual</h4>
        {steps && steps.length > 0 ? (
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.tex} className="rounded-md bg-muted p-2">
                <Tex tex={s.tex} display />
                {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">Sin lectura válida para calcular.</p>
        )}
      </TabsContent>

      <TabsContent value="signal" className="text-sm">
        <ol className="space-y-2">
          {info.signalPath.map((s, i) => (
            <li key={s.stage} className="flex gap-3">
              <span className="font-mono text-copper">{i + 1}</span>
              <div>
                <p className="font-medium">{s.stage}</p>
                <p className="text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </TabsContent>

      <TabsContent value="circuit" className="space-y-3 text-sm">
        <p>{info.circuit.summary}</p>
        <ul className="space-y-1.5 font-mono text-xs">
          {info.circuit.connections.map((cn) => (
            <li key={`${cn.from}-${cn.to}`}>
              {cn.from} → {cn.to}
              {cn.note && <span className="text-muted-foreground"> · {cn.note}</span>}
            </li>
          ))}
        </ul>
        {info.commonErrors.length > 0 && (
          <>
            <h4 className="font-medium">Errores comunes</h4>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {info.commonErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </>
        )}
      </TabsContent>
    </Tabs>
  )
}

import { RadioTower } from 'lucide-react'
import { DEVICE_ID } from '@/config/device'

/** Base vacía (caso inicial): todavía no llegó ninguna trama del dispositivo ni del simulador. */
export function NoReadingsState() {
  return (
    <section
      aria-labelledby="no-readings-title"
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center"
    >
      <span className="relative flex size-12 items-center justify-center rounded-full bg-primary/10">
        <RadioTower aria-hidden className="size-6 text-primary" />
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-primary/10 motion-reduce:hidden"
        />
      </span>
      <h2 id="no-readings-title" className="font-semibold">
        Sin lecturas todavía
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        El dispositivo <span className="font-mono">{DEVICE_ID}</span> o el simulador aún no envía
        datos. Cuando llegue la primera trama aparecerá aquí sola, sin recargar la página.
      </p>
      <p className="text-xs text-muted-foreground">Esperando datos en tiempo real…</p>
    </section>
  )
}

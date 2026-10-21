import { Skeleton } from '@/components/ui/skeleton'

/** Mientras se descarga el código de una pantalla (primera visita). */
export function PageFallback() {
  return (
    <div aria-busy="true" aria-label="Cargando pantalla" className="space-y-4 p-4">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  )
}

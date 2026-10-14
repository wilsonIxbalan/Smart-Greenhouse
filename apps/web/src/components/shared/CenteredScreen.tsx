import { Sprout } from 'lucide-react'
import type { ReactNode } from 'react'

/** Pantalla completa centrada (login, acceso, configuración) con la marca arriba. */
export function CenteredScreen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-8">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Sprout aria-hidden className="size-6 text-primary" />
        Invernadero Inteligente
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}

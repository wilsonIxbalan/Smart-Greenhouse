import { Settings2 } from 'lucide-react'
import { CenteredScreen } from '@/components/shared/CenteredScreen'

/** Se muestra en lugar de la app si faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. */
export function ConfigErrorScreen({ problems }: { problems: string[] }) {
  return (
    <CenteredScreen>
      <section
        role="alert"
        aria-labelledby="config-title"
        className="space-y-3 rounded-xl border border-critical/50 bg-card p-6"
      >
        <div className="flex items-center gap-2">
          <Settings2 aria-hidden className="size-6 shrink-0 text-critical" />
          <h1 id="config-title" className="text-lg font-semibold">
            Falta configurar Supabase
          </h1>
        </div>
        <ul className="list-disc space-y-1 pl-5 font-mono text-xs break-words">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Copia <code className="font-mono">apps/web/.env.example</code> como{' '}
            <code className="font-mono">apps/web/.env.local</code>.
          </li>
          <li>Completa la URL y la llave pública del proyecto (Project Settings → API).</li>
          <li>
            Reinicia <code className="font-mono">pnpm dev</code>. En Vercel, define las mismas
            variables en el proyecto.
          </li>
        </ol>
      </section>
    </CenteredScreen>
  )
}

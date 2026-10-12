import { ChevronDown, ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { SIGNAL_STAGES } from '@/config/components'
import { cn } from '@/lib/utils'

export function SignalPathSection() {
  return (
    <section aria-label="Ruta de la señal" data-testid="section-signal" className="space-y-3">
      <SectionHeader
        title="Ruta de la señal"
        description="En cobre, la parte electrónica; en verde, la de software."
      />
      <ol className="flex flex-col items-stretch gap-1 lg:flex-row lg:items-center">
        {SIGNAL_STAGES.map((s, i) => (
          <Fragment key={s.key}>
            {i > 0 && (
              <li aria-hidden className="flex justify-center text-muted-foreground">
                <ChevronDown className="size-4 lg:hidden" />
                <ChevronRight className="hidden size-4 lg:block" />
              </li>
            )}
            <li
              className={cn(
                'flex-1 rounded-lg border p-3 lg:min-h-28',
                s.electronic ? 'border-copper/50 bg-copper/10' : 'border-primary/40 bg-primary/10',
              )}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn('font-mono', s.electronic ? 'text-copper' : 'text-primary')}>
                  {i + 1}
                </span>
                {s.title}
              </p>
              <p className="text-xs text-muted-foreground">{s.detail}</p>
            </li>
          </Fragment>
        ))}
      </ol>
    </section>
  )
}

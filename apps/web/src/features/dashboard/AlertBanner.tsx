import type { Telemetry } from '@inv/contracts'
import { OctagonAlert, TriangleAlert } from 'lucide-react'
import { DASHBOARD_ALERTS } from '@/config/alerts'
import { cn } from '@/lib/utils'

export function AlertBanner({ frame }: { frame: Telemetry }) {
  const active = DASHBOARD_ALERTS.filter((a) => a.when(frame))
  if (active.length === 0) return null

  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {active.map((a) => {
        const Icon = a.tone === 'critical' ? OctagonAlert : TriangleAlert
        return (
          <div
            key={a.key}
            role={a.tone === 'critical' ? 'alert' : 'status'}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              a.tone === 'critical'
                ? 'border-critical/50 bg-critical/10'
                : 'border-warning/50 bg-warning/10',
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                'mt-0.5 size-5 shrink-0',
                a.tone === 'critical' ? 'text-critical' : 'text-warning',
              )}
            />
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-sm text-muted-foreground">{a.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

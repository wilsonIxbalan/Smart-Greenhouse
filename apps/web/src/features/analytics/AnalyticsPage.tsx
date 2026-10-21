import { ChartNoAxesCombined, Download, Mail } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ALERT_TYPES_UI } from '@/config/alerts'
import { RANGES, type RangeKey } from '@/config/analytics'
import { DEVICE_ID } from '@/config/device'
import { useAuth, usePermissions } from '@/features/auth/hooks'
import { useRangeData, useSendReport, type RangeData } from './hooks'
import { KpiCard } from './KpiCard'
import { formatPercent, formatValue, summarize } from './kpis'
import { RangeChart } from './RangeChart'

async function makePdf(range: (typeof RANGES)[number], data: RangeData, email: string) {
  const { buildReportPdf, reportFileName } = await import('./report-pdf')
  const generatedAt = Date.now()
  const input = {
    range,
    deviceId: DEVICE_ID,
    generatedBy: email,
    generatedAt,
    from: data.from,
    to: data.to,
    points: data.points,
    alerts: data.alerts,
    summary: summarize(data.points, data.alerts, data.to),
  }
  return { blob: await buildReportPdf(input), name: reportFileName(input) }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function AnalyticsPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>('24h')
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[0]
  const query = useRangeData(range)
  const send = useSendReport()
  const auth = useAuth()
  const { can } = usePermissions()
  const [building, setBuilding] = useState<'download' | 'send' | null>(null)

  const data = query.data
  const summary = useMemo(
    () => (data ? summarize(data.points, data.alerts, data.to) : null),
    [data],
  )
  const email = auth.status === 'signed-in' ? (auth.email ?? 'usuario') : 'usuario'
  const hasData = (data?.points.length ?? 0) > 0
  const busy = building !== null || send.isPending

  async function onPdf(action: 'download' | 'send') {
    if (!data) return
    setBuilding(action)
    try {
      const { blob, name } = await makePdf(range, data, email)
      if (action === 'download') download(blob, name)
      else send.mutate({ range: range.key, pdf: blob })
    } catch (e) {
      console.error('[reporte] no se pudo generar el PDF:', e)
      toast.error('No se pudo generar el PDF.')
    } finally {
      setBuilding(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold lg:text-2xl">Analítica</h1>
        <p className="text-sm text-muted-foreground">
          Promedios por hora que calcula la nube con las tramas del dispositivo (se actualizan cada
          10 min). El reporte en PDF resume el periodo elegido.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Periodo" className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              role="radio"
              aria-checked={r.key === range.key}
              variant={r.key === range.key ? 'default' : 'outline'}
              size="sm"
              className="min-h-11"
              onClick={() => setRangeKey(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={!hasData || busy}
            onClick={() => void onPdf('download')}
          >
            <Download aria-hidden />
            {building === 'download' ? 'Generando…' : 'Descargar PDF'}
          </Button>
          {can('report.send') && (
            <Button
              className="min-h-11"
              disabled={!hasData || busy}
              onClick={() => void onPdf('send')}
            >
              <Mail aria-hidden />
              {building === 'send' || send.isPending ? 'Enviando…' : 'Enviar por correo'}
            </Button>
          )}
        </div>
      </div>

      {query.isPending ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : query.isError ? (
        <ErrorState
          title="No se pudo cargar la analítica"
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : !data || !hasData || !summary ? (
        <EmptyState
          icon={ChartNoAxesCombined}
          title="Sin datos en este periodo"
          description="Con el dispositivo o el simulador enviando tramas, la primera hora aparece en máximo 10 minutos."
        />
      ) : (
        <>
          <section className="space-y-3">
            <SectionHeader title="Resumen" description={range.title} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <KpiCard
                label="Tramas recibidas"
                value={formatPercent(summary.coverage?.ratio ?? null)}
                tone="primary"
                detail={
                  summary.coverage
                    ? `${summary.coverage.received.toLocaleString('es-GT')} de ${Math.round(summary.coverage.expected).toLocaleString('es-GT')} (1 cada 10 s)`
                    : 'Falta una hora completa'
                }
              />
              <KpiCard
                label="Bomba encendida"
                value={formatPercent(summary.pumpRatio)}
                tone="water"
                detail="del tiempo con datos"
              />
              <KpiCard
                label="Alertas"
                value={String(summary.alerts.total)}
                tone={summary.alerts.critical ? 'critical' : 'warning'}
                detail={
                  summary.alerts.critical
                    ? `${summary.alerts.critical} críticas`
                    : 'Ninguna crítica'
                }
              />
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Variables"
              description="Promedio del periodo · mínimo y máximo por hora"
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {summary.series.map(({ def, stats }) => (
                <KpiCard
                  key={def.key}
                  label={def.label}
                  value={formatValue(stats.avg, def.decimals)}
                  unit={def.unit}
                  tone={def.tone}
                  detail={`mín ${formatValue(stats.min, def.decimals)} · máx ${formatValue(stats.max, def.decimals)}`}
                  warning={
                    stats.breachHours > 0 && def.threshold
                      ? `${stats.breachHours} h ${def.breach === 'below' ? 'bajo' : 'sobre'} ${def.threshold.value}`
                      : undefined
                  }
                />
              ))}
            </div>
          </section>

          <section className="min-w-0 space-y-3">
            <SectionHeader title="Tendencia" description={range.title} />
            <RangeChart points={data.points} range={range} />
          </section>

          <section className="space-y-3">
            <SectionHeader title="Alertas del periodo" />
            {summary.alerts.total === 0 ? (
              <p className="text-sm text-muted-foreground">Sin alertas en este periodo.</p>
            ) : (
              <Card className="gap-0 p-0">
                <ul className="divide-y">
                  {summary.alerts.byType.map(({ type, count }) => {
                    const { title, icon: Icon } = ALERT_TYPES_UI[type]
                    return (
                      <li key={type} className="flex items-center gap-3 px-4 py-3 text-sm">
                        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">{title}</span>
                        <span className="font-semibold tabular-nums">{count}</span>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  )
}

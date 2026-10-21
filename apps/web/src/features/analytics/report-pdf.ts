import type { jsPDF } from 'jspdf'
import { ALERT_TYPES_UI, SEVERITY_UI } from '@/config/alerts'
import { ANALYTICS_MAX_ALERTS, type AnalyticsSeries, type RangeDef } from '@/config/analytics'
import { formatDuration } from '@/lib/sensors'
import type { AlertRow, HourlyPoint } from '@/lib/supabase/types'
import { formatPercent, formatValue, HOUR_MS, type Summary } from './kpis'

export interface ReportInput {
  range: RangeDef
  deviceId: string
  generatedBy: string
  generatedAt: number
  from: number
  to: number
  points: readonly HourlyPoint[]
  alerts: readonly AlertRow[]
  summary: Summary
}

// A4 vertical en mm.
const W = 210
const H = 297
const M = 16
const CW = W - 2 * M

const TOKENS = [
  'card',
  'foreground',
  'muted-foreground',
  'muted',
  'border',
  'primary',
  'copper',
  'water',
  'warning',
  'critical',
] as const
type Token = (typeof TOKENS)[number]
type Rgb = [number, number, number]
type Palette = Record<Token, Rgb>

const zone = { timeZone: 'America/Guatemala' } as const
const dateTimeFmt = new Intl.DateTimeFormat('es-GT', {
  ...zone,
  dateStyle: 'medium',
  timeStyle: 'short',
})
const timeFmt = new Intl.DateTimeFormat('es-GT', { ...zone, hour: '2-digit', minute: '2-digit' })
const dayFmt = new Intl.DateTimeFormat('es-GT', { ...zone, day: 'numeric', month: 'short' })
const isoDayFmt = new Intl.DateTimeFormat('en-CA', zone)

function hexToRgb(value: string): Rgb {
  const hex = value.trim().replace('#', '')
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  const n = Number.parseInt(full, 16)
  if (full.length !== 6 || Number.isNaN(n)) return [80, 80, 80]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Colores del tema claro (el papel siempre es claro), leídos de tokens.css. */
function readPalette(): Palette {
  const probe = document.createElement('div')
  probe.className = 'theme-light'
  probe.hidden = true
  document.body.append(probe)
  try {
    const css = getComputedStyle(probe)
    return Object.fromEntries(
      TOKENS.map((t) => [t, hexToRgb(css.getPropertyValue(`--${t}`))]),
    ) as Palette
  } finally {
    probe.remove()
  }
}

/** Mezcla con blanco: franjas y fondos suaves sin transparencia. */
const tint = (c: Rgb, amount: number): Rgb =>
  c.map((v) => Math.round(v * amount + 255 * (1 - amount))) as Rgb

export const reportFileName = (input: Pick<ReportInput, 'range' | 'generatedAt'>) =>
  `reporte-invernadero-${input.range.key}-${isoDayFmt.format(input.generatedAt)}.pdf`

class Writer {
  readonly doc: jsPDF
  readonly c: Palette

  constructor(doc: jsPDF, c: Palette) {
    this.doc = doc
    this.c = c
  }

  font(size: number, style: 'normal' | 'bold' = 'normal', color: Token = 'foreground') {
    this.doc.setFont('helvetica', style)
    this.doc.setFontSize(size)
    this.doc.setTextColor(...this.c[color])
  }

  fill(color: Rgb) {
    this.doc.setFillColor(...color)
  }

  stroke(color: Rgb, width = 0.2) {
    this.doc.setDrawColor(...color)
    this.doc.setLineWidth(width)
  }

  title(text: string, y: number) {
    this.font(16, 'bold')
    this.doc.text(text, M, y)
    this.stroke(this.c.primary, 0.6)
    this.doc.line(M, y + 2.5, M + 24, y + 2.5)
  }

  /** Párrafo con salto de línea; devuelve la y siguiente. */
  paragraph(text: string, y: number, size = 10, color: Token = 'muted-foreground') {
    this.font(size, 'normal', color)
    const lines = this.doc.splitTextToSize(text, CW) as string[]
    this.doc.text(lines, M, y)
    return y + lines.length * size * 0.45 + 2
  }
}

function coverPage(w: Writer, input: ReportInput) {
  const { doc, c } = w
  const { summary, range } = input
  w.fill(c.primary)
  doc.rect(0, 0, W, 64, 'F')
  w.font(26, 'bold', 'card')
  doc.text('Invernadero Inteligente', M, 32)
  w.font(13, 'normal', 'card')
  doc.text(`Reporte de analítica · ${range.title}`, M, 44)
  doc.text('Frutos de Guatemala · Zacapa', M, 52)

  const rows: [string, string][] = [
    ['Periodo', `${dateTimeFmt.format(input.from)} – ${dateTimeFmt.format(input.to)}`],
    ['Dispositivo', input.deviceId],
    ['Generado', `${dateTimeFmt.format(input.generatedAt)} (hora de Guatemala)`],
    ['Por', input.generatedBy],
    ['Curso', 'Electrónica Digital · UMG'],
  ]
  let y = 84
  for (const [label, value] of rows) {
    w.font(10, 'bold', 'muted-foreground')
    doc.text(label, M, y)
    w.font(11)
    doc.text(value, M + 30, y)
    y += 9
  }

  y += 8
  w.font(12, 'bold')
  doc.text('Resumen del periodo', M, y)
  y += 6
  const boxes: [string, string, string][] = [
    [
      'Tramas recibidas',
      formatPercent(summary.coverage?.ratio ?? null),
      summary.coverage
        ? `${summary.coverage.received.toLocaleString('es-GT')} de ${Math.round(summary.coverage.expected).toLocaleString('es-GT')}`
        : 'Sin horas completas',
    ],
    ['Bomba encendida', formatPercent(summary.pumpRatio), 'del tiempo con datos'],
    [
      'Alertas',
      String(summary.alerts.total),
      summary.alerts.critical ? `${summary.alerts.critical} críticas` : 'ninguna crítica',
    ],
  ]
  const gap = 5
  const bw = (CW - gap * 2) / 3
  boxes.forEach(([label, value, note], i) => {
    const x = M + i * (bw + gap)
    w.fill(tint(c.primary, 0.08))
    w.stroke(c.border)
    doc.roundedRect(x, y, bw, 30, 2, 2, 'FD')
    w.font(9, 'normal', 'muted-foreground')
    doc.text(label, x + 4, y + 7)
    w.font(18, 'bold')
    doc.text(value, x + 4, y + 18)
    w.font(8, 'normal', 'muted-foreground')
    doc.text(note, x + 4, y + 25)
  })
  y += 42
  w.paragraph(
    'Los valores son promedios por hora que calcula la nube a partir de las tramas del dispositivo ' +
      '(una cada 10 s). El Arduino Mega decide los actuadores con sus propios umbrales; aquí solo se ' +
      `resume lo que reportó. Horas con datos en el periodo: ${summary.hoursWithData}.`,
    y,
  )
}

function kpiPage(w: Writer, input: ReportInput) {
  const { doc, c } = w
  w.title('Indicadores por variable', M + 8)
  const cols = [
    { label: 'Variable', w: 50 },
    { label: 'Unidad', w: 16 },
    { label: 'Promedio', w: 22 },
    { label: 'Mínimo', w: 22 },
    { label: 'Máximo', w: 22 },
    { label: 'Umbral', w: 22 },
    { label: 'Horas fuera', w: 24 },
  ] as const
  let y = M + 20
  const rowH = 10
  w.fill(c.muted)
  doc.rect(M, y, CW, rowH, 'F')
  w.font(9, 'bold')
  let x = M
  for (const col of cols) {
    doc.text(col.label, x + 2, y + 6.5)
    x += col.w
  }
  y += rowH

  for (const { def, stats } of input.summary.series) {
    const cells = [
      def.label,
      def.unit,
      formatValue(stats.avg, def.decimals),
      formatValue(stats.min, def.decimals),
      formatValue(stats.max, def.decimals),
      def.threshold ? `${def.threshold.value}` : '—',
      def.breach && def.threshold ? `${stats.breachHours} h` : '—',
    ]
    const labelLines = doc.splitTextToSize(def.label, cols[0].w - 4) as string[]
    const h = Math.max(rowH, labelLines.length * 4.2 + 4)
    x = M
    cols.forEach((col, i) => {
      const bad = i === 6 && stats.breachHours > 0
      w.font(9, i === 2 ? 'bold' : 'normal', bad ? 'critical' : 'foreground')
      doc.text(i === 0 ? labelLines : (cells[i] ?? ''), x + 2, y + 6.5)
      x += col.w
    })
    w.stroke(c.border)
    doc.line(M, y + h, M + CW, y + h)
    y += h
  }

  y += 10
  w.font(12, 'bold')
  doc.text('Actuadores y comunicación', M, y)
  y += 8
  const { pumpRatio, coverage } = input.summary
  const facts = [
    `Bomba de riego encendida el ${formatPercent(pumpRatio)} del tiempo con datos.`,
    coverage
      ? `Tramas recibidas: ${coverage.received.toLocaleString('es-GT')} de ${Math.round(coverage.expected).toLocaleString('es-GT')} esperadas (${formatPercent(coverage.ratio)}), contando desde la primera hora con datos. Las que faltan son cortes de energía o de Wi-Fi.`
      : 'Todavía no hay horas completas para calcular las tramas recibidas.',
    '"Horas fuera": horas en las que el máximo (o el mínimo, en humedad de suelo) cruzó el umbral de actuación.',
  ]
  for (const f of facts) y = w.paragraph(f, y)
}

function drawChart(w: Writer, input: ReportInput, s: AnalyticsSeries, top: number, height: number) {
  const { doc, c } = w
  const color = c[s.tone]
  w.font(11, 'bold')
  doc.text(`${s.label} (${s.unit})`, M, top)

  const x0 = M + 14
  const x1 = M + CW
  const y0 = top + 4
  const y1 = top + height
  const pts = input.points.filter((p) => p[s.avg] !== null)
  if (pts.length === 0) {
    w.font(9, 'normal', 'muted-foreground')
    doc.text('Sin datos en el periodo.', x0, y0 + 10)
    return
  }

  const values: number[] = []
  for (const p of pts) {
    for (const col of [s.avg, s.min, s.max]) {
      const v = col ? p[col] : null
      if (v !== null) values.push(v)
    }
  }
  if (s.threshold) values.push(s.threshold.value)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (hi - lo < 1e-6) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.08
  lo = lo >= 0 ? Math.max(0, lo - pad) : lo - pad
  hi += pad
  // Eje X: el periodo completo, hasta el final de la hora en curso.
  const end = input.from + input.range.hours * HOUR_MS
  const sx = (t: number) => x0 + ((t - input.from) / (end - input.from)) * (x1 - x0)
  const sy = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0)

  // Rejilla y eje Y
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4
    const y = sy(v)
    w.stroke(c.border, 0.15)
    doc.line(x0, y, x1, y)
    w.font(7, 'normal', 'muted-foreground')
    doc.text(formatValue(v, s.decimals), x0 - 1.5, y + 1, { align: 'right' })
  }
  // Eje X: 5 marcas en el periodo
  const fmt = input.range.tick === 'time' ? timeFmt : dayFmt
  for (let i = 0; i <= 4; i++) {
    const t = input.from + ((end - input.from) * i) / 4
    w.font(7, 'normal', 'muted-foreground')
    doc.text(fmt.format(t), sx(t), y1 + 4, {
      align: i === 0 ? 'left' : i === 4 ? 'right' : 'center',
    })
  }

  // Franja mín.–máx. por hora
  if (s.min || s.max) {
    w.fill(tint(color, 0.22))
    for (const p of pts) {
      const avg = p[s.avg] ?? 0
      const a = s.max ? (p[s.max] ?? avg) : avg
      const b = s.min ? (p[s.min] ?? avg) : avg
      const left = sx(p.t)
      const right = Math.min(x1, sx(p.t + HOUR_MS))
      if (right - left > 0) doc.rect(left, sy(a), right - left, Math.max(0.2, sy(b) - sy(a)), 'F')
    }
  }

  // Umbral
  if (s.threshold) {
    const y = sy(s.threshold.value)
    w.stroke(c.warning, 0.35)
    doc.setLineDashPattern([1.5, 1.2], 0)
    doc.line(x0, y, x1, y)
    doc.setLineDashPattern([], 0)
    w.font(7, 'normal', 'warning')
    doc.text(`${s.threshold.label} (${s.threshold.value})`, x1, y - 1.2, { align: 'right' })
  }

  // Promedio: se corta en las horas sin datos
  w.stroke(color, 0.5)
  pts.forEach((b, i) => {
    const a = pts[i - 1]
    if (!a || b.t - a.t > HOUR_MS * 1.5) return
    const va = a[s.avg]
    const vb = b[s.avg]
    if (va === null || vb === null) return
    doc.line(sx(a.t + HOUR_MS / 2), sy(va), sx(b.t + HOUR_MS / 2), sy(vb))
  })
  const only = pts.length === 1 ? pts[0] : undefined
  if (only) {
    w.fill(color)
    doc.circle(sx(only.t + HOUR_MS / 2), sy(only[s.avg] ?? 0), 0.8, 'F')
  }

  w.stroke(c.border, 0.25)
  doc.line(x0, y1, x1, y1)
}

function chartPages(w: Writer, input: ReportInput) {
  const perPage = 4
  const height = 46
  const step = 58
  input.summary.series.forEach(({ def }, i) => {
    if (i % perPage === 0) {
      w.doc.addPage()
      w.title(i === 0 ? 'Gráficas' : 'Gráficas (continuación)', M + 8)
    }
    drawChart(w, input, def, M + 24 + (i % perPage) * step, height)
  })
  w.paragraph(
    'Línea: promedio por hora. Franja: mínimo y máximo de cada hora. Línea punteada: umbral de actuación.',
    H - M - 10,
    8,
  )
}

function alertsPage(w: Writer, input: ReportInput) {
  const { doc, c } = w
  doc.addPage()
  w.title('Alertas del periodo', M + 8)
  let y = M + 20
  const { alerts } = input
  if (alerts.length === 0) {
    w.paragraph('Sin alertas en el periodo.', y, 11)
    return
  }
  for (const { type, count } of input.summary.alerts.byType) {
    w.font(10)
    doc.text(`${ALERT_TYPES_UI[type].title}: ${count}`, M, y)
    y += 6
  }
  if (alerts.length >= ANALYTICS_MAX_ALERTS) {
    y = w.paragraph(`Se muestran las primeras ${ANALYTICS_MAX_ALERTS} alertas.`, y, 9)
  }
  y += 4

  const cols = [
    { label: 'Inicio', w: 38 },
    { label: 'Tipo', w: 66 },
    { label: 'Severidad', w: 26 },
    { label: 'Duración', w: 48 },
  ]
  const header = () => {
    w.fill(c.muted)
    doc.rect(M, y, CW, 8, 'F')
    w.font(9, 'bold')
    let x = M
    for (const col of cols) {
      doc.text(col.label, x + 2, y + 5.5)
      x += col.w
    }
    y += 8
  }
  header()
  for (const a of alerts) {
    if (y > H - M - 16) {
      doc.addPage()
      y = M + 8
      header()
    }
    const cells = [
      dateTimeFmt.format(a.createdAt),
      ALERT_TYPES_UI[a.type].title,
      SEVERITY_UI[a.severity].label,
      a.resolvedAt === null ? 'Sigue abierta' : formatDuration(a.resolvedAt - a.createdAt),
    ]
    let x = M
    cols.forEach((col, i) => {
      w.font(8.5, 'normal', i === 2 && a.severity === 'critical' ? 'critical' : 'foreground')
      doc.text(cells[i] ?? '', x + 2, y + 5, { maxWidth: col.w - 3 })
      x += col.w
    })
    w.stroke(c.border, 0.15)
    doc.line(M, y + 7.5, M + CW, y + 7.5)
    y += 7.5
  }
}

function footers(w: Writer, input: ReportInput) {
  const total = w.doc.getNumberOfPages()
  for (let i = 2; i <= total; i++) {
    w.doc.setPage(i)
    w.font(8, 'normal', 'muted-foreground')
    w.doc.text(`Invernadero Inteligente · ${input.deviceId} · ${input.range.title}`, M, H - 8)
    w.doc.text(`Página ${i} de ${total}`, W - M, H - 8, { align: 'right' })
  }
}

/** Portada, indicadores, gráficas y alertas. jsPDF se descarga solo al generar el primer reporte. */
export async function buildReportPdf(input: ReportInput): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  doc.setProperties({
    title: `Reporte del invernadero · ${input.range.title}`,
    author: input.generatedBy,
    creator: 'Invernadero Inteligente',
  })
  const w = new Writer(doc, readPalette())
  coverPage(w, input)
  doc.addPage()
  kpiPage(w, input)
  chartPages(w, input)
  alertsPage(w, input)
  footers(w, input)
  return doc.output('blob')
}

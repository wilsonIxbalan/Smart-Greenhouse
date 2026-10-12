import type { Telemetry } from '@inv/contracts'

export type InfoKey = 'soil-moisture' | 'air-climate' | 'light' | 'air-quality' | 'soil-7in1'

export interface FormulaStep {
  /** Expresión KaTeX con los valores ya sustituidos. */
  tex: string
  /** Explicación breve del paso. */
  note?: string
}

export interface ElectronicsInfo {
  key: InfoKey
  title: string
  /** Pestaña Componente: sensor, modelo, alimentación, interfaz, pines del Mega. */
  component: {
    name: string
    model: string
    supply: string
    interface: string
    pins: string
    notes?: string[]
  }
  /** Pestaña Principio: cómo convierte la magnitud física en señal eléctrica. */
  principle: string[]
  /** Pestaña Fórmula: expresión general + pasos calculados con la lectura viva (null si no hay dato). */
  formula: {
    general: string
    variables: { symbol: string; meaning: string }[]
    compute: (frame: Telemetry) => FormulaStep[] | null
  }
  /** Pestaña Señal: etapas desde el sensor hasta la pantalla. */
  signalPath: { stage: string; detail: string }[]
  /** Pestaña Circuito: conexión descrita (sin esquemático gráfico por ahora). */
  circuit: { summary: string; connections: { from: string; to: string; note?: string }[] }
  commonErrors: string[]
}

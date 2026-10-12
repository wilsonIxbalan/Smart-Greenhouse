import type { Telemetry } from '@inv/contracts'
import { THRESHOLDS } from '@/config/thresholds'

export interface AlertDef {
  key: string
  tone: 'critical' | 'warning'
  title: string
  description: string
  when: (f: Telemetry) => boolean
}

/** Condiciones que muestran el banner del dashboard (severidad según BR-S04). */
export const DASHBOARD_ALERTS = [
  {
    key: 'co-high',
    tone: 'critical',
    title: 'Gas o CO alto',
    description: 'El Mega forzó la ventilación y activó la alarma.',
    when: (f) => f.co > THRESHOLDS.mq7MaxAdc || f.aire_mq135 > THRESHOLDS.mq135MaxAdc,
  },
  {
    key: 'no-water',
    tone: 'warning',
    title: 'Sin agua en el depósito',
    description: 'La bomba está bloqueada hasta que el sensor de nivel detecte agua.',
    when: (f) => f.agua === 0,
  },
  {
    key: 'soil-no-reading',
    tone: 'warning',
    title: 'Suelo sin lectura',
    description: 'El sensor 7 en 1 no responde por RS-485; revisa la conexión.',
    when: (f) => f.suelo_ok === 0,
  },
  {
    key: 'dht-no-reading',
    tone: 'warning',
    title: 'DHT22 sin lectura',
    description: 'No hay temperatura ni humedad del aire válidas.',
    when: (f) => f.dht_ok === 0,
  },
] as const satisfies readonly AlertDef[]

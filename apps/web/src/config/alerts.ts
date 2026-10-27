import type { Telemetry } from '@inv/contracts'
import { Droplets, Sprout, Wind, type LucideIcon } from 'lucide-react'
import type { StatusTone } from '@/components/shared/StatusChip'
import { THRESHOLDS } from '@/config/thresholds'
import type { AlertSeverity, AlertType } from '@/lib/supabase/types'

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
    title: 'DHT11 sin lectura',
    description: 'No hay temperatura ni humedad del aire válidas.',
    when: (f) => f.dht_ok === 0,
  },
] as const satisfies readonly AlertDef[]

/** Alertas guardadas en la nube (`alerts.type`): las abre y resuelve la base con cada lectura. */
export const ALERT_TYPES_UI: Record<AlertType, { title: string; icon: LucideIcon }> = {
  co_high: { title: 'Monóxido de carbono alto (MQ-7)', icon: Wind },
  air_high: { title: 'Calidad del aire baja (MQ-135)', icon: Wind },
  no_water: { title: 'Depósito sin agua', icon: Droplets },
  soil_no_reading: { title: 'Sensor de suelo sin lectura', icon: Sprout },
  soil_unfit: { title: 'Suelo no apto', icon: Sprout },
}

export const SEVERITY_UI: Record<AlertSeverity, { label: string; tone: StatusTone }> = {
  info: { label: 'Aviso', tone: 'neutral' },
  warning: { label: 'Advertencia', tone: 'warning' },
  critical: { label: 'Crítica', tone: 'critical' },
}

/** Pestaña "Historial": abiertas + las creadas en los últimos días. */
export const ALERT_HISTORY_DAYS = 7

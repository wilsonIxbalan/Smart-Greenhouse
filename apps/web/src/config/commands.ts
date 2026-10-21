import { DEFAULT_TTL_S } from '@inv/contracts'
import type { StatusTone } from '@/components/shared/StatusChip'
import type { CommandStatus } from '@/lib/supabase/types'

/** BR-C02: duración del modo manual; al vencer, el Mega vuelve a automático. */
export const TTL_OPTIONS = [
  { seconds: 300, label: '5 min' },
  { seconds: DEFAULT_TTL_S, label: '10 min' },
  { seconds: 1800, label: '30 min' },
  { seconds: 3600, label: '60 min' },
] as const

export const DEFAULT_TTL = DEFAULT_TTL_S

/** BR-C06: lo que ve el usuario en cada estado del comando. */
export const COMMAND_STATUS_UI: Record<
  CommandStatus,
  { label: string; tone: StatusTone; detail: string }
> = {
  pending: {
    label: 'Enviando…',
    tone: 'neutral',
    detail: 'Esperando a que el dispositivo lo tome',
  },
  sent: {
    label: 'Enviando…',
    tone: 'neutral',
    detail: 'Entregado; esperando la confirmación del Mega',
  },
  acked: {
    label: 'Confirmado',
    tone: 'ok',
    detail: 'El Mega lo ejecutó; se verá en la próxima lectura',
  },
  failed: { label: 'Rechazado', tone: 'critical', detail: 'El comando no se ejecutó' },
  expired: { label: 'Expiró', tone: 'warning', detail: 'El comando no se ejecutó' },
}

/** Motivo por código: del Mega (ACK) o de la nube (09/08 SQL). */
export const COMMAND_ERROR_TEXT: Record<string, string> = {
  NO_WATER: 'no hay agua en el depósito (el Mega protege la bomba)',
  INTERLOCK_CO: 'gas o CO alto: el Mega mantiene la ventilación encendida',
  BAD_CMD: 'el Mega no reconoció el comando',
  BAD_VAL: 'valor fuera de rango para el Mega',
  MISMATCH: 'el Mega entendió otro comando (posible ruido en el cable); revisa el estado real',
  NO_ACK: 'el Mega no respondió después de 3 intentos',
  NOT_TAKEN: 'el dispositivo no lo tomó en 30 s (¿está en línea?)',
}

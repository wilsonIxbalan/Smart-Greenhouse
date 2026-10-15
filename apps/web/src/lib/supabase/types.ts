import type { Actuator, Telemetry } from '@inv/contracts'
import type { Role } from '@/config/permissions'

/** Trama v1 validada + momento en que la recibió la nube (ms epoch). */
export interface Reading {
  frame: Telemetry
  receivedAt: number
}

/** Columnas promediadas que devuelve el RPC `reading_history`. */
export const HISTORY_COLUMNS = ['aire_t', 'aire_h', 'suelo_h', 'lux', 'aire_mq135', 'co'] as const
export type HistoryColumn = (typeof HISTORY_COLUMNS)[number]

/** Un bloque del historial: inicio (ms epoch), muestras y promedios (null = sin lectura válida). */
export type HistoryPoint = { t: number; samples: number } & Record<HistoryColumn, number | null>

export interface DeviceStatus {
  online: boolean
  lastSeenAt: number | null
  openAlerts: number
}

export const COMMAND_KINDS = ['switch', 'level', 'angle', 'auto'] as const
export type CommandKind = (typeof COMMAND_KINDS)[number]

export const COMMAND_STATUSES = ['pending', 'sent', 'acked', 'failed', 'expired'] as const
export type CommandStatus = (typeof COMMAND_STATUSES)[number]

/** Lo que la web pide a `issue_command` (sin id: lo asigna la base). `actuator` null = AUTO global. */
export interface CommandRequest {
  kind: CommandKind
  actuator: Actuator | null
  value: number | null
  ttlS: number | null
}

/** Fila de `commands`: intención + estado que reportó el dispositivo (ACK). */
export interface CommandRow extends CommandRequest {
  id: number
  status: CommandStatus
  /** Código del Mega (NO_WATER…) o de la nube (NO_ACK, NOT_TAKEN, REPLACED). */
  error: string | null
  createdAt: number
  resolvedAt: number | null
}

export interface Profile {
  id: string
  email: string | null
  fullName: string | null
  role: Role
  active: boolean
}

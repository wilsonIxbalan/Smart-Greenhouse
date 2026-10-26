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

/** Columnas de `readings_hourly` (agregados por hora que calcula pg_cron). */
export const HOURLY_COLUMNS = [
  'aire_t_avg',
  'aire_t_min',
  'aire_t_max',
  'aire_h_avg',
  'suelo_h_avg',
  'suelo_h_min',
  'suelo_h_max',
  'ph_avg',
  'ec_avg',
  'lux_avg',
  'mq135_avg',
  'mq135_max',
  'co_avg',
  'co_max',
  'bomba_on_ratio',
] as const
export type HourlyColumn = (typeof HOURLY_COLUMNS)[number]

/** Una hora agregada: inicio (ms epoch), tramas recibidas y valores (null = sin lectura válida). */
export type HourlyPoint = { t: number; samples: number } & Record<HourlyColumn, number | null>

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

/** Fila de `audit_log` (solo admin). `actor` null = cambio hecho desde el dashboard o el SQL Editor. */
export interface AuditEntry {
  id: number
  actor: string | null
  action: string
  entity: string
  entityId: string | null
  details: Record<string, unknown> | null
  createdAt: number
}

/** Autor de una entrada de la bitácora. */
export interface AuditPerson {
  name: string
  role: Role
}

export const ALERT_TYPES = [
  'co_high',
  'air_high',
  'no_water',
  'soil_no_reading',
  'soil_unfit',
] as const
export type AlertType = (typeof ALERT_TYPES)[number]

export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]

/** Fila de `alerts`: la abre y la resuelve la nube (evaluate_reading); el usuario solo la reconoce. */
export interface AlertRow {
  id: number
  type: AlertType
  severity: AlertSeverity
  message: string
  value: number | null
  createdAt: number
  acknowledgedBy: string | null
  acknowledgedAt: number | null
  resolvedAt: number | null
}

export interface Profile {
  id: string
  email: string | null
  fullName: string | null
  role: Role
  active: boolean
}

/** Fila de `rfid_cards`: tarjeta que el Mega deja pasar (si está activa). */
export interface AccessCard {
  id: number
  uid: string
  holder: string
  active: boolean
  createdAt: number
  updatedAt: number
}

/** Fila de `rfid_events`: un intento en el lector. `granted` es lo que decidió el Mega. */
export interface AccessEvent {
  id: number
  uid: string
  granted: boolean
  cardId: number | null
  /** Nombre al momento del intento; null = tarjeta no registrada. */
  holder: string | null
  receivedAt: number
}

/** Fila de `rfid_sync`: versión de la lista en la nube y la que confirmó el Mega. */
export interface AccessSync {
  cardsVersion: number
  megaVersion: number | null
  checkedAt: number | null
}

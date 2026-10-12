import type { Ack, Command, Telemetry } from '@inv/contracts'

/** Trama recibida + momento en que llegó (ms epoch). */
export interface Reading {
  frame: Telemetry
  receivedAt: number
}

export type HistoryRange = '24h'

export interface DeviceStatus {
  online: boolean
  lastSeenAt: number | null
}

export interface DataSource {
  readonly kind: 'mock' | 'supabase'
  getLatest(): Promise<Reading | null>
  getHistory(range: HistoryRange): Promise<Reading[]>
  /** Recibe cada trama nueva; devuelve la función para cancelar. */
  subscribe(onFrame: (reading: Reading) => void): () => void
  /** Resuelve con el ACK del dispositivo; rechaza con CommandExpiredError si no llega a tiempo. */
  sendCommand(cmd: Command): Promise<Ack>
  getDeviceStatus(): Promise<DeviceStatus>
}

export class CommandExpiredError extends Error {
  readonly commandId: number
  constructor(commandId: number) {
    super(`El comando #${commandId} expiró sin confirmación del dispositivo`)
    this.name = 'CommandExpiredError'
    this.commandId = commandId
  }
}

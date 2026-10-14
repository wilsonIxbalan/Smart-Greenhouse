import { MAX_FRAME_BYTES, telemetrySchema, type Ack, type Telemetry } from '@inv/contracts'

export interface CloudConfig {
  url: string
  apiKey: string
  deviceId: string
  deviceKey: string
}

interface PulledCommand {
  id: number
  wire: string
}

/** Mismo canal que usará el ESP32: RPC PostgREST `device_*` con la llave del dispositivo. */
export class CloudLink {
  private readonly cfg: CloudConfig

  constructor(cfg: CloudConfig) {
    this.cfg = cfg
  }

  async ingest(frame: Telemetry): Promise<unknown> {
    const parsed = telemetrySchema.safeParse(frame)
    if (!parsed.success) throw new Error(`Trama fuera del contrato: ${parsed.error.message}`)
    const bytes = Buffer.byteLength(JSON.stringify(frame))
    if (bytes > MAX_FRAME_BYTES) throw new Error(`Trama de ${bytes} B (máx. ${MAX_FRAME_BYTES})`)
    return this.rpc('device_ingest', { p_frame: frame, p_fw_version: 'simulador' })
  }

  async pullCommands(): Promise<PulledCommand[]> {
    return (await this.rpc('device_pull_commands', {})) as PulledCommand[]
  }

  async ack(ack: Ack): Promise<unknown> {
    return this.rpc('device_ack', { p_ack: ack })
  }

  private async rpc(fn: string, body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${this.cfg.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: this.cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_device_id: this.cfg.deviceId, p_key: this.cfg.deviceKey, ...body }),
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`${fn} → HTTP ${res.status}: ${text.slice(0, 200)}`)
    return text ? JSON.parse(text) : null
  }
}

export function cloudConfigFromEnv(env: NodeJS.ProcessEnv): CloudConfig {
  const missing = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'DEVICE_ID', 'DEVICE_KEY'].filter(
    (k) => !env[k] || env[k]?.includes('<'),
  )
  if (missing.length) {
    throw new Error(`Faltan variables en tools/simulator/.env: ${missing.join(', ')}`)
  }
  return {
    url: env.SUPABASE_URL!.replace(/\/+$/, ''),
    apiKey: env.SUPABASE_ANON_KEY!,
    deviceId: env.DEVICE_ID!,
    deviceKey: env.DEVICE_KEY!,
  }
}

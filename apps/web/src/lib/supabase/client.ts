import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { TIMING } from '@/config/thresholds'
import { SUPABASE_ENV } from '@/lib/env'

export class SupabaseConfigError extends Error {
  constructor(problems: string[]) {
    super(`Supabase no está configurado: ${problems.join('; ')}`)
    this.name = 'SupabaseConfigError'
  }
}

// Toda petición HTTP (PostgREST, RPC, Auth) se corta si no responde a tiempo.
const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController()
  const outer = init?.signal
  if (outer?.aborted) controller.abort(outer.reason)
  outer?.addEventListener('abort', () => controller.abort(outer.reason), { once: true })
  const timer = setTimeout(
    () => controller.abort(new Error('Tiempo de espera agotado')),
    TIMING.requestTimeoutMs,
  )
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

let client: SupabaseClient | null = null

/** Cliente único, creado al primer uso; falla con un error claro si faltan las variables. */
export function getSupabase(): SupabaseClient {
  if (!SUPABASE_ENV.ok) throw new SupabaseConfigError(SUPABASE_ENV.problems)
  client ??= createClient(SUPABASE_ENV.url, SUPABASE_ENV.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  })
  return client
}

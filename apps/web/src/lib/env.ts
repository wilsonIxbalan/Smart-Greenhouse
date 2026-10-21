import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url({
    protocol: /^https?$/,
    error: 'falta o no es una URL válida (https://<proyecto>.supabase.co)',
  }),
  VITE_SUPABASE_ANON_KEY: z
    .string({ error: 'falta la llave pública (publishable o anon)' })
    .min(20, { error: 'la llave pública parece incompleta' })
    .refine((v) => !v.includes('<'), { error: 'todavía tiene el texto de ejemplo' }),
})

export type SupabaseEnv =
  { ok: true; url: string; anonKey: string } | { ok: false; problems: string[] }

export function readSupabaseEnv(env: ImportMetaEnv): SupabaseEnv {
  const parsed = envSchema.safeParse(env)
  if (parsed.success) {
    return {
      ok: true,
      url: parsed.data.VITE_SUPABASE_URL,
      anonKey: parsed.data.VITE_SUPABASE_ANON_KEY,
    }
  }
  return {
    ok: false,
    problems: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  }
}

/** Configuración de Supabase leída una sola vez al cargar la app. */
export const SUPABASE_ENV = readSupabaseEnv(import.meta.env)

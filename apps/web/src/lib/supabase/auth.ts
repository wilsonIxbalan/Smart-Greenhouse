import { isAuthApiError, isAuthRetryableFetchError, type Session } from '@supabase/supabase-js'
import { z } from 'zod'
import { ROLES } from '@/config/permissions'
import { getSupabase } from './client'
import { dataError } from './parse'
import type { Profile } from './types'

export type { Session }

/** Emite la sesión actual al suscribirse (INITIAL_SESSION) y en cada cambio. */
export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

const WRONG_CREDENTIALS = 'Correo o contraseña incorrectos.'
const AUTH_MESSAGES: Partial<Record<string, string>> = {
  invalid_credentials: WRONG_CREDENTIALS,
  email_not_confirmed: 'El correo aún no está confirmado. Pide al administrador que lo confirme.',
  user_banned: 'Esta cuenta está bloqueada. Habla con el administrador.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentar.',
}

function authMessage(error: unknown): string {
  if (isAuthRetryableFetchError(error))
    return 'No hay conexión con el servidor. Revisa tu internet.'
  if (isAuthApiError(error)) {
    const known = error.code ? AUTH_MESSAGES[error.code] : undefined
    if (known) return known
    if (error.status === 400) return WRONG_CREDENTIALS
  }
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.'
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (error) {
    console.warn('[auth] inicio de sesión fallido:', error.code ?? error.message)
    throw new Error(authMessage(error))
  }
}

/** Cierra solo esta sesión; el cliente borra la sesión local aunque falle la red. */
export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' })
  if (error) console.warn('[auth] cierre de sesión con error:', error.message)
}

const profileSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  role: z.enum(ROLES),
  active: z.boolean(),
})

/** Perfil propio (RLS: cada quien ve el suyo aunque esté inactivo). null si no existe. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, email, full_name, role, active')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw dataError('No se pudo leer tu perfil', error)
  if (!data) return null
  const parsed = profileSchema.safeParse(data)
  if (!parsed.success) {
    throw dataError('Tu perfil llegó con un formato inesperado', {
      message: z.prettifyError(parsed.error),
    })
  }
  const { full_name, ...rest } = parsed.data
  return { ...rest, fullName: full_name }
}

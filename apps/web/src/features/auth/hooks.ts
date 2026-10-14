import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { NavItem } from '@/config/nav'
import { can, type Permission, type Role } from '@/config/permissions'
import { AuthContext, type AuthState } from '@/features/auth/auth-context'
import { fetchProfile, onAuthChange, signInWithPassword, signOut } from '@/lib/supabase/auth'

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

export function useProfile() {
  const auth = useAuth()
  const userId = auth.status === 'signed-in' ? auth.userId : null
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => (userId ? fetchProfile(userId) : null),
    enabled: userId !== null,
  })
}

/** Rol efectivo: solo cuenta si el perfil existe y está activo (igual que `auth_role()` en SQL). */
export function usePermissions() {
  const { data: profile } = useProfile()
  const role: Role | null = profile?.active ? profile.role : null
  const check = useCallback((permission: Permission) => can(role, permission), [role])
  return { role, can: check }
}

export function useSignIn() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signInWithPassword(email, password),
  })
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut })
}

/** Filtra destinos de navegación según el permiso declarado en `config/nav`. */
export function useAllowedNav(items: readonly NavItem[]): readonly NavItem[] {
  const { can: allowed } = usePermissions()
  return useMemo(
    () => items.filter((item) => !item.permission || allowed(item.permission)),
    [items, allowed],
  )
}

const sameState = (a: AuthState, b: AuthState) =>
  a.status === b.status &&
  (a.status !== 'signed-in' || (b.status === 'signed-in' && a.userId === b.userId))

/** Escucha Supabase Auth; al salir (o cambiar de usuario) vacía la caché de datos. */
export function useAuthSession(): AuthState {
  const qc = useQueryClient()
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  useEffect(
    () =>
      onAuthChange((session) => {
        const next: AuthState = session
          ? { status: 'signed-in', userId: session.user.id, email: session.user.email ?? null }
          : { status: 'signed-out' }
        if (next.status === 'signed-out') qc.clear()
        setState((prev) => (sameState(prev, next) ? prev : next))
      }),
    [qc],
  )
  return state
}

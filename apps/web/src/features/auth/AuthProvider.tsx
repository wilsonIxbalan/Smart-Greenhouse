import type { ReactNode } from 'react'
import { AuthContext } from '@/features/auth/auth-context'
import { useAuthSession } from '@/features/auth/hooks'

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useAuthSession()
  return <AuthContext value={state}>{children}</AuthContext>
}

import { createContext } from 'react'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; userId: string; email: string | null }

export const AuthContext = createContext<AuthState | null>(null)

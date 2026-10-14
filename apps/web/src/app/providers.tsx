import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { makeQueryClient } from '@/app/query-client'
import { AuthProvider } from '@/features/auth/AuthProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  const [qc] = useState(makeQueryClient)
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

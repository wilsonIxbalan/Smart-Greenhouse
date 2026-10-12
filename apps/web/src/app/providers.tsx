import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { makeQueryClient } from '@/app/query-client'
import { createDataSource, DataSourceContext, type DataSource } from '@/lib/data-source'

interface AppProvidersProps {
  children: ReactNode
  dataSource?: DataSource
  queryClient?: QueryClient
}

export function AppProviders({ children, dataSource, queryClient }: AppProvidersProps) {
  const [ds] = useState(() => dataSource ?? createDataSource())
  const [qc] = useState(() => queryClient ?? makeQueryClient())
  return (
    <QueryClientProvider client={qc}>
      <DataSourceContext.Provider value={ds}>{children}</DataSourceContext.Provider>
    </QueryClientProvider>
  )
}

import { createContext, useContext } from 'react'
import type { DataSource } from './types'

export const DataSourceContext = createContext<DataSource | null>(null)

export function useDataSource(): DataSource {
  const ds = useContext(DataSourceContext)
  if (!ds) throw new Error('useDataSource debe usarse dentro de <DataSourceProvider>')
  return ds
}

import type { Scenario } from '@inv/contracts'
import { SCENARIO_QUERY_PARAM, SCENARIOS } from '@/config/demo'
import { MockDataSource } from './mock'
import type { DataSource } from './types'

export function scenarioFromSearch(search: string): Scenario {
  const value = new URLSearchParams(search).get(SCENARIO_QUERY_PARAM)
  return SCENARIOS.find((s) => s === value) ?? 'normal'
}

/** Elige la fuente de datos según VITE_DATA_SOURCE (por defecto mock). */
export function createDataSource(
  kind: string | undefined = import.meta.env.VITE_DATA_SOURCE,
  search: string = typeof window === 'undefined' ? '' : window.location.search,
): DataSource {
  const selected = kind || 'mock'
  if (selected === 'mock') return new MockDataSource({ scenario: scenarioFromSearch(search) })
  if (selected === 'supabase') {
    throw new Error('VITE_DATA_SOURCE=supabase aún no está disponible (pendiente B8). Usa "mock".')
  }
  throw new Error(`VITE_DATA_SOURCE desconocido: "${selected}". Valor válido: mock.`)
}

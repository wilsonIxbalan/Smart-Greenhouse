import type { Scenario } from '@inv/contracts'

/** Parámetro de URL para elegir el escenario simulado en la demo: `?escenario=co_alto`. */
export const SCENARIO_QUERY_PARAM = 'escenario'

export const SCENARIOS: readonly Scenario[] = ['normal', 'co_alto', 'sin_agua', 'falla_suelo']

export const SCENARIO_LABEL: Record<Scenario, string> = {
  normal: 'Normal',
  co_alto: 'CO alto',
  sin_agua: 'Sin agua',
  falla_suelo: 'Falla de suelo',
}

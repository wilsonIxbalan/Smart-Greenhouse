import { Activity, BarChart3, Bell, Cpu, Gauge, type LucideIcon } from 'lucide-react'
import type { Permission } from '@/config/permissions'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Si se define, el destino solo aparece para los roles con ese permiso. */
  permission?: Permission
  /** Contador junto a la etiqueta (por ahora solo alertas abiertas). */
  badge?: 'openAlerts'
}

/** Destinos principales: nav inferior en móvil y primer grupo del menú lateral en escritorio. */
export const bottomNav: readonly NavItem[] = [
  { to: '/', label: 'Inicio', icon: Gauge },
  { to: '/control', label: 'Control', icon: Activity, permission: 'actuators.control' },
  { to: '/analitica', label: 'Analítica', icon: BarChart3 },
  { to: '/electronica', label: 'Electrónica', icon: Cpu },
]

/** Destinos secundarios: solo en el menú lateral de escritorio. */
export const secondaryNav: readonly NavItem[] = [
  { to: '/alertas', label: 'Alertas', icon: Bell, badge: 'openAlerts' },
]

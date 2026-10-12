import { Activity, BarChart3, Bell, Cpu, Gauge, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Destinos principales: nav inferior en móvil y primer grupo del menú lateral en escritorio. */
export const bottomNav: readonly NavItem[] = [
  { to: '/', label: 'Inicio', icon: Gauge },
  { to: '/control', label: 'Control', icon: Activity },
  { to: '/analitica', label: 'Analítica', icon: BarChart3 },
  { to: '/electronica', label: 'Electrónica', icon: Cpu },
]

/** Destinos secundarios: solo en el menú lateral de escritorio. */
export const secondaryNav: readonly NavItem[] = [
  { to: '/alertas', label: 'Alertas', icon: Bell },
  { to: '/admin/usuarios', label: 'Admin', icon: Users },
]

export const sideNav: readonly NavItem[] = [...bottomNav, ...secondaryNav]

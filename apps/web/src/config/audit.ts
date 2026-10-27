import {
  Bell,
  Cpu,
  FileText,
  KeyRound,
  Power,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

/** Filtros de la Bitácora: cada categoría agrupa entidades de `audit_log`. */
export const AUDIT_CATEGORIES = [
  { key: 'all', label: 'Todo', entities: null },
  { key: 'commands', label: 'Comandos', entities: ['commands'] },
  { key: 'alerts', label: 'Alertas', entities: ['alerts'] },
  { key: 'reports', label: 'Reportes', entities: ['report'] },
  { key: 'access', label: 'Tarjetas', entities: ['rfid_cards'] },
  {
    key: 'admin',
    label: 'Administración',
    entities: ['profiles', 'devices', 'thresholds', 'notification_targets'],
  },
] as const satisfies readonly { key: string; label: string; entities: readonly string[] | null }[]
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number]['key']

/** Ícono por entidad; lo que no esté aquí usa `Settings`. */
export const AUDIT_ENTITY_ICON: Record<string, LucideIcon> = {
  commands: Power,
  alerts: Bell,
  report: FileText,
  profiles: Users,
  devices: Cpu,
  rfid_cards: KeyRound,
}
export const AUDIT_DEFAULT_ICON = Settings

export const AUDIT_PAGE_SIZE = 50

/** Autor cuando `actor` es null. */
export const AUDIT_SYSTEM_ACTOR = 'Supabase (dashboard o SQL)'

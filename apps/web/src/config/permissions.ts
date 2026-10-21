export const ROLES = ['admin', 'operador'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  operador: 'Operador',
}

/** Qué rol puede hacer qué. Usuarios, roles y umbrales se administran en el dashboard de Supabase. */
export const PERMISSIONS = {
  'data.view': ['admin', 'operador'],
  'actuators.control': ['admin', 'operador'],
  'alerts.ack': ['admin', 'operador'],
  'report.send': ['admin', 'operador'],
  'audit.view': ['admin'],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false
  const allowed: readonly Role[] = PERMISSIONS[permission]
  return allowed.includes(role)
}

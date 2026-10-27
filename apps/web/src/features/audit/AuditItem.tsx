import { StatusChip, type StatusTone } from '@/components/shared/StatusChip'
import { formatUid } from '@/config/access'
import { ALERT_TYPES_UI } from '@/config/alerts'
import { RANGES } from '@/config/analytics'
import { AUDIT_DEFAULT_ICON, AUDIT_ENTITY_ICON, AUDIT_SYSTEM_ACTOR } from '@/config/audit'
import { COMMAND_ERROR_TEXT, COMMAND_STATUS_UI } from '@/config/commands'
import { ROLE_LABEL } from '@/config/permissions'
import type { AlertType, AuditEntry, AuditPerson, CommandStatus } from '@/lib/supabase/types'

export interface AuditContext {
  people: Map<string, AuditPerson> | undefined
  commands: Map<number, { status: CommandStatus; error: string | null }>
  alerts: Map<number, AlertType>
}

interface Described {
  text: string
  note?: string
  chip?: { tone: StatusTone; label: string }
}

const time = new Intl.DateTimeFormat('es-GT', { timeStyle: 'short' })

const str = (d: AuditEntry['details'], key: string) => {
  const v = d?.[key]
  return typeof v === 'string' || typeof v === 'number' ? String(v) : null
}

const VERB: Record<string, string> = { insert: 'creado', update: 'actualizado', delete: 'borrado' }
const CARD_VERB: Record<string, string> = {
  insert: 'agregada',
  update: 'actualizada',
  delete: 'borrada',
}

const rangeLabel = (key: string | null) => RANGES.find((r) => r.key === key)?.label ?? key ?? '?'

/** Texto legible de cada acción registrada en `audit_log`. */
function describe(e: AuditEntry, ctx: AuditContext): Described {
  const d = e.details
  const id = Number(e.entityId)
  switch (e.action) {
    case 'issue_command': {
      const outcome = ctx.commands.get(id)
      const ui = outcome ? COMMAND_STATUS_UI[outcome.status] : null
      const wire = (str(d, 'wire') ?? '').replace(/^#\d+ /, '')
      return {
        text: `Envió ${wire || `el comando #${e.entityId}`}`,
        ...(ui && { chip: { tone: ui.tone, label: ui.label } }),
        ...(outcome?.error && { note: COMMAND_ERROR_TEXT[outcome.error] ?? outcome.error }),
      }
    }
    case 'acknowledge_alert': {
      const type = ctx.alerts.get(id)
      return {
        text: type
          ? `Reconoció la alerta «${ALERT_TYPES_UI[type].title}»`
          : `Reconoció la alerta #${e.entityId}`,
      }
    }
    case 'report_sent': {
      const n = Number(str(d, 'recipients') ?? 0)
      return {
        text: `Envió el reporte de ${rangeLabel(e.entityId)} a ${n} ${n === 1 ? 'destinatario' : 'destinatarios'}`,
        chip: { tone: 'ok', label: 'Enviado' },
      }
    }
    case 'report_failed':
      return {
        text: `Pidió el reporte de ${rangeLabel(e.entityId)}`,
        chip: { tone: 'critical', label: 'Falló' },
        ...(str(d, 'error') && { note: str(d, 'error') ?? '' }),
      }
    case 'report_pending':
      return {
        text: `Pidió el reporte de ${rangeLabel(e.entityId)}`,
        chip: { tone: 'neutral', label: 'Enviando…' },
      }
    case 'set_device_key':
      return { text: `Generó una llave nueva para el dispositivo ${e.entityId ?? ''}` }
  }

  const verb = VERB[e.action] ?? e.action
  switch (e.entity) {
    case 'profiles': {
      const role = str(d, 'role')
      const state =
        e.action === 'delete'
          ? ''
          : ` · ${role === 'admin' || role === 'operador' ? ROLE_LABEL[role] : (role ?? '')}, ${d?.active ? 'activo' : 'inactivo'}`
      return { text: `Usuario ${verb}: ${str(d, 'email') ?? e.entityId}${state}` }
    }
    case 'thresholds': {
      const value = e.action === 'delete' ? '' : ` = ${str(d, 'value')} ${str(d, 'unit') ?? ''}`
      return { text: `Umbral «${str(d, 'key') ?? e.entityId}» ${verb}${value}`.trim() }
    }
    case 'notification_targets': {
      const channel = str(d, 'channel') === 'telegram' ? 'Telegram' : 'correo'
      const state = e.action === 'delete' ? '' : d?.active ? ' (activo)' : ' (inactivo)'
      return {
        text: `Destino de ${channel} «${str(d, 'label') ?? str(d, 'destination')}» ${verb}${state}`,
      }
    }
    case 'devices':
      return { text: `Dispositivo ${str(d, 'name') ?? e.entityId} ${verb}` }
    case 'rfid_cards': {
      const uid = str(d, 'uid')
      const state = e.action === 'delete' ? '' : d?.active ? ' · activa' : ' · desactivada'
      return {
        text: `Tarjeta de ${str(d, 'holder') ?? '?'} ${CARD_VERB[e.action] ?? e.action}${state}`,
        ...(uid && { note: formatUid(uid) }),
      }
    }
    default:
      return { text: `${e.action} en ${e.entity}` }
  }
}

export function AuditItem({ entry, ctx }: { entry: AuditEntry; ctx: AuditContext }) {
  const Icon = AUDIT_ENTITY_ICON[entry.entity] ?? AUDIT_DEFAULT_ICON
  const { text, note, chip } = describe(entry, ctx)
  const person = entry.actor ? ctx.people?.get(entry.actor) : null
  const who = !entry.actor
    ? AUDIT_SYSTEM_ACTOR
    : person
      ? `${person.name} · ${ROLE_LABEL[person.role]}`
      : ctx.people
        ? 'Usuario borrado'
        : '…'

  return (
    <div className="flex items-start gap-3 py-3">
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm break-words">{text}</p>
          {chip && <StatusChip tone={chip.tone} label={chip.label} />}
        </div>
        {note && <p className="text-xs break-words text-muted-foreground">{note}</p>}
        <p className="text-xs text-muted-foreground">
          {who} · {time.format(entry.createdAt)}
        </p>
      </div>
    </div>
  )
}

import { LoaderCircle } from 'lucide-react'
import { StatusChip } from '@/components/shared/StatusChip'
import type { ActuatorDef } from '@/config/actuators'
import { COMMAND_ERROR_TEXT, COMMAND_STATUS_UI } from '@/config/commands'
import type { CommandRow } from '@/lib/supabase/types'
import { describeCommand } from './command-view'
import { isInFlight } from './hooks'

/** Estado del último comando: Enviando… → Confirmado / Rechazado (motivo) / Expiró. */
export function CommandStatusLine({ command, def }: { command: CommandRow; def?: ActuatorDef }) {
  const ui = COMMAND_STATUS_UI[command.status]
  const reason = command.error ? (COMMAND_ERROR_TEXT[command.error] ?? command.error) : null
  return (
    <div role="status" aria-live="polite" className="flex min-w-0 items-start gap-2 text-xs">
      {isInFlight(command) ? (
        <LoaderCircle
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 animate-spin text-muted-foreground"
        />
      ) : null}
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusChip tone={ui.tone} label={ui.label} />
          <span className="font-medium">{describeCommand(command, def)}</span>
        </div>
        <p className="break-words text-muted-foreground">
          {reason ? `Motivo: ${reason}` : ui.detail}
        </p>
      </div>
    </div>
  )
}

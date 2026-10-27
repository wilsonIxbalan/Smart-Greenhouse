import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { StatusChip } from '@/components/shared/StatusChip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { formatUid } from '@/config/access'
import type { AccessCard } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface CardListProps {
  cards: AccessCard[]
  canManage: boolean
  busyId: number | null
  onToggle: (card: AccessCard, active: boolean) => void
  onDelete: (card: AccessCard) => void
}

export function CardList({ cards, canManage, busyId, onToggle, onDelete }: CardListProps) {
  const [toDelete, setToDelete] = useState<AccessCard | null>(null)
  return (
    <>
      <ul className="divide-y rounded-xl border bg-card">
        {cards.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn('text-sm font-medium', !c.active && 'text-muted-foreground')}>
                  {c.holder}
                </span>
                {!c.active && <StatusChip tone="neutral" label="Desactivada" />}
              </div>
              <p className="font-mono text-xs break-all text-muted-foreground">
                {formatUid(c.uid)}
              </p>
            </div>
            {canManage && (
              <>
                <Switch
                  checked={c.active}
                  disabled={busyId === c.id}
                  onCheckedChange={(v) => onToggle(c, v)}
                  aria-label={`${c.active ? 'Desactivar' : 'Activar'} la tarjeta de ${c.holder}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 text-muted-foreground hover:text-critical"
                  disabled={busyId === c.id}
                  aria-label={`Borrar la tarjeta de ${c.holder}`}
                  onClick={() => setToDelete(c)}
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar la tarjeta de {toDelete?.holder}?</AlertDialogTitle>
            <AlertDialogDescription>
              Ya no abrirá la puerta. Las entradas que registró se conservan. Si solo quieres
              bloquearla por un tiempo, desactívala en lugar de borrarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11"
              onClick={() => {
                if (toDelete) onDelete(toDelete)
                setToDelete(null)
              }}
            >
              Borrar tarjeta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

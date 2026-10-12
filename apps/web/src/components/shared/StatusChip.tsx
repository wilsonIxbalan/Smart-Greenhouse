import { cn } from '@/lib/utils'

export type StatusTone = 'ok' | 'warning' | 'critical' | 'neutral'

const toneClass: Record<StatusTone, string> = {
  ok: 'bg-primary/15 text-primary',
  warning: 'bg-warning/15 text-warning',
  critical: 'bg-critical/15 text-critical',
  neutral: 'bg-muted text-muted-foreground',
}

interface StatusChipProps {
  tone: StatusTone
  label: string
  className?: string
}

export function StatusChip({ tone, label, className }: StatusChipProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClass[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

import { Zap } from 'lucide-react'

interface InfoElectronicaChipProps {
  onClick?: () => void
  /** Nombre de la métrica, para un aria-label único por tarjeta. */
  label?: string
}

export function InfoElectronicaChip({ onClick, label }: InfoElectronicaChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ? `Info Electrónica: ${label}` : undefined}
      className="inline-flex min-h-11 items-center gap-1 rounded-full border border-copper/40 px-3 text-xs font-medium text-copper hover:bg-copper/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Zap aria-hidden className="size-3" />
      Info Electrónica
    </button>
  )
}

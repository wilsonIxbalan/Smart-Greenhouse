import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Algo salió mal', description, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-critical/40 p-8 text-center"
    >
      <TriangleAlert aria-hidden className="size-8 text-critical" />
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <Button variant="outline" className="min-h-11" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

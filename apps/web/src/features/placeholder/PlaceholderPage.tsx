import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

export function PlaceholderPage({ title, block }: { title: string; block: string }) {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <EmptyState
        icon={Construction}
        title="En construcción"
        description={`Se implementa en ${block}.`}
      />
    </section>
  )
}

import { cn } from '@/lib/utils'

export function EmptyState({ title, description, className }: { title: string; description: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center', className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

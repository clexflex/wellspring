import { cn } from '@/lib/utils'

export function ErrorAlert({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn('rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive', className)}>
      {message}
    </div>
  )
}

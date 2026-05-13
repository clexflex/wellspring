export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-sm text-muted-foreground">
      {label}
    </div>
  )
}

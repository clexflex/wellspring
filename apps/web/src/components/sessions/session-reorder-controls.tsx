'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function SessionReorderControls({
  canMoveUp,
  canMoveDown,
  disabled,
  onMoveUp,
  onMoveDown,
}: {
  canMoveUp: boolean
  canMoveDown: boolean
  disabled: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || !canMoveUp}
        onClick={onMoveUp}
        aria-label="Move session up"
        title="Move session up"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || !canMoveDown}
        onClick={onMoveDown}
        aria-label="Move session down"
        title="Move session down"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
    </div>
  )
}

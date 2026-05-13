'use client'

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
      <Button variant="outline" size="sm" disabled={disabled || !canMoveUp} onClick={onMoveUp}>
        Up
      </Button>
      <Button variant="outline" size="sm" disabled={disabled || !canMoveDown} onClick={onMoveDown}>
        Down
      </Button>
    </div>
  )
}

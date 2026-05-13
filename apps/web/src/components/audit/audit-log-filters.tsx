'use client'

import type { AuditAction } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

const actions: AuditAction[] = [
  'CREATOR_SIGNED_UP',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_CONFIRMED',
  'PROGRAM_CREATED',
  'PROGRAM_UPDATED',
  'PROGRAM_DELETED',
  'SESSION_CREATED',
  'SESSION_UPDATED',
  'SESSION_DELETED',
  'SESSIONS_REORDERED',
  'SESSIONS_IMPORTED',
  'UPLOAD_URL_CREATED',
]

export function AuditLogFilters({
  filters,
  onChange,
  onSubmit,
  onReset,
  isLoading,
}: {
  filters: { action: string; from: string; to: string }
  onChange: (field: 'action' | 'from' | 'to', value: string) => void
  onSubmit: () => void
  onReset: () => void
  isLoading: boolean
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-4 md:items-end">
      <div className="space-y-2">
        <Label htmlFor="action">Action</Label>
        <Select id="action" value={filters.action} onChange={(event) => onChange('action', event.target.value)}>
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="from">From</Label>
        <Input id="from" type="datetime-local" value={filters.from} onChange={(event) => onChange('from', event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="to">To</Label>
        <Input id="to" type="datetime-local" value={filters.to} onChange={(event) => onChange('to', event.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Apply filters'}
        </Button>
        <Button variant="outline" onClick={onReset} disabled={isLoading}>
          Reset
        </Button>
      </div>
    </div>
  )
}

import type { PoolClient } from 'pg'

import type { AuditAction } from './actions'
import type { AuditLogRow } from './presenters'

export type ListAuditLogsFilters = {
  from?: Date
  to?: Date
  action?: AuditAction
  limit: number
  cursor?: {
    createdAt: string
    id: string
  }
}

export async function listAuditLogs(
  client: PoolClient,
  filters: ListAuditLogsFilters
): Promise<AuditLogRow[]> {
  const values: Array<string | Date | number> = []
  const conditions: string[] = []

  if (filters.from) {
    values.push(filters.from)
    conditions.push(`created_at >= $${values.length}`)
  }

  if (filters.to) {
    values.push(filters.to)
    conditions.push(`created_at <= $${values.length}`)
  }

  if (filters.action) {
    values.push(filters.action)
    conditions.push(`action = $${values.length}`)
  }

  if (filters.cursor) {
    values.push(filters.cursor.createdAt)
    values.push(filters.cursor.id)
    conditions.push(`(created_at, id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`)
  }

  values.push(filters.limit + 1)

  const whereClause = conditions.length > 0 ? `where ${conditions.join(' and ')}` : ''
  const result = await client.query<AuditLogRow>(
    `
      select id, actor_creator_id, action, target_type, target_id, metadata, created_at
      from public.audit_logs
      ${whereClause}
      order by created_at desc, id desc
      limit $${values.length}
    `,
    values
  )

  return result.rows
}

import type { PoolClient } from 'pg'

import type { AuditAction, AuditTargetType } from './actions'

export type RecordAuditLogInput = {
  actorCreatorId: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  metadata?: Record<string, unknown>
}

export async function recordAuditLog(client: PoolClient, input: RecordAuditLogInput): Promise<void> {
  await client.query(
    `
      insert into public.audit_logs (actor_creator_id, action, target_type, target_id, metadata)
      values ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      input.actorCreatorId,
      input.action,
      input.targetType,
      input.targetId,
      JSON.stringify(input.metadata ?? {}),
    ]
  )
}

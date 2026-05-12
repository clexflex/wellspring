import type { QueryResultRow } from 'pg'

export type AuditLogRow = QueryResultRow & {
  id: string
  actor_creator_id: string
  action: string
  target_type: string
  target_id: string
  metadata: Record<string, unknown>
  created_at: Date
}

export type AuditLogCursor = {
  createdAt: string
  id: string
}

export function encodeAuditLogCursor(cursor: AuditLogCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

export function decodeAuditLogCursor(cursor: string): AuditLogCursor {
  const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<AuditLogCursor>

  if (typeof decoded.createdAt !== 'string' || typeof decoded.id !== 'string') {
    throw new Error('Invalid cursor')
  }

  return {
    createdAt: decoded.createdAt,
    id: decoded.id,
  }
}

export function presentAuditLog(row: AuditLogRow) {
  return {
    id: row.id,
    actorCreatorId: row.actor_creator_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
  }
}

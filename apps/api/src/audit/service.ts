import { AppError } from '../http/errors'
import { withTenantContext } from '../db/tenant-context'
import type { AuditAction } from './actions'
import { decodeAuditLogCursor, encodeAuditLogCursor, presentAuditLog } from './presenters'
import { listAuditLogs } from './repository'

export type ListAuditLogsInput = {
  creatorId: string
  from?: Date
  to?: Date
  action?: AuditAction
  limit: number
  cursor?: string
}

export async function listCreatorAuditLogs(input: ListAuditLogsInput) {
  let decodedCursor:
    | {
        createdAt: string
        id: string
      }
    | undefined

  if (input.cursor) {
    try {
      decodedCursor = decodeAuditLogCursor(input.cursor)
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload', {
        issues: {
          fieldErrors: {
            cursor: ['Invalid cursor'],
          },
          formErrors: [],
        },
      })
    }
  }

  return withTenantContext(input.creatorId, async (client) => {
    const rows = await listAuditLogs(client, {
      from: input.from,
      to: input.to,
      action: input.action,
      limit: input.limit,
      cursor: decodedCursor,
    })

    const hasMore = rows.length > input.limit
    const pageRows = hasMore ? rows.slice(0, input.limit) : rows
    const lastRow = pageRows.at(-1)

    return {
      items: pageRows.map(presentAuditLog),
      pageInfo: {
        hasMore,
        nextCursor:
          hasMore && lastRow
            ? encodeAuditLogCursor({
                createdAt: lastRow.created_at.toISOString(),
                id: lastRow.id,
              })
            : null,
      },
    }
  })
}

import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../audit/actions'
import { recordAuditLog } from '../audit/record'
import { withTenantContext } from '../db/tenant-context'
import { AppError } from '../http/errors'
import { findProgramById } from '../programs/repository'
import { parseSessionImportCsv } from './csv-parser'
import { presentBulkImportResult } from './presenters'
import {
  findBulkImportByClientImportId,
  getProgramSessionMaxPosition,
  insertBulkImport,
  insertBulkImportRow,
  insertImportedSession,
  listBulkImportRowsByImportId,
  updateBulkImportCompletion,
  type BulkImportStatus,
} from './repository'

function notFound(): never {
  throw new AppError(404, 'NOT_FOUND', 'Resource not found')
}

function failedImportStatus(failedCount: number): BulkImportStatus {
  if (failedCount === 0) {
    return 'completed'
  }

  return 'completed_with_errors'
}

export async function importCreatorProgramSessions(input: {
  creatorId: string
  programId: string
  clientImportId: string
  csv: string
}) {
  return withTenantContext(input.creatorId, async (client) => {
    const program = await findProgramById(client, input.programId)
    if (!program) {
      notFound()
    }

    const createdImport = await insertBulkImport(client, {
      clientImportId: input.clientImportId,
    })

    if (!createdImport) {
      const existingImport = await findBulkImportByClientImportId(client, input.clientImportId)
      if (!existingImport) {
        throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Unable to load previous import result')
      }

      const existingRows = await listBulkImportRowsByImportId(client, existingImport.id)
      return presentBulkImportResult({
        importRecord: existingImport,
        rowRecords: existingRows,
        replayed: true,
      })
    }

    const parsedRows = parseSessionImportCsv(input.csv)
    const existingMaxPosition = await getProgramSessionMaxPosition(client, input.programId)

    let insertedCount = 0
    let failedCount = 0

    for (const row of parsedRows) {
      if (row.errors.length > 0) {
        failedCount += 1
        await insertBulkImportRow(client, {
          bulkImportId: createdImport.id,
          rowNumber: row.rowNumber,
          status: 'failed',
          errorMessage: row.errors[0] ?? 'Invalid row',
          payload: {
            normalized: row.normalized,
            errors: row.errors,
            sessionId: null,
          },
        })
        continue
      }

      const position = existingMaxPosition + insertedCount + 1
      const insertedSession = await insertImportedSession(client, {
        programId: input.programId,
        title: row.normalized.title,
        description: row.normalized.description,
        durationSeconds: row.normalized.durationSeconds,
        position,
        instructorName: row.normalized.instructorName,
        tags: row.normalized.tags,
        mediaUrl: row.normalized.mediaUrl,
        mediaType: row.normalized.mediaType,
      })

      insertedCount += 1

      await insertBulkImportRow(client, {
        bulkImportId: createdImport.id,
        rowNumber: row.rowNumber,
        status: 'inserted',
        errorMessage: null,
        payload: {
          normalized: row.normalized,
          errors: [],
          sessionId: insertedSession.id,
        },
      })
    }

    const status = failedImportStatus(failedCount)
    const completedAt = new Date().toISOString()

    const completedImport = await updateBulkImportCompletion(client, {
      bulkImportId: createdImport.id,
      status,
      resultSummary: {
        insertedCount,
        failedCount,
        completedAt,
        programId: input.programId,
        status,
      },
    })

    await recordAuditLog(client, {
      actorCreatorId: input.creatorId,
      action: AUDIT_ACTIONS.SESSIONS_IMPORTED,
      targetType: AUDIT_TARGET_TYPES.BULK_IMPORT,
      targetId: createdImport.id,
      metadata: {
        programId: input.programId,
        clientImportId: input.clientImportId,
        insertedCount,
        failedCount,
        status,
      },
    })

    const persistedRows = await listBulkImportRowsByImportId(client, createdImport.id)

    return presentBulkImportResult({
      importRecord: completedImport,
      rowRecords: persistedRows,
      replayed: false,
    })
  })
}

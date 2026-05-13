import type { BulkImportRecord, BulkImportRowRecord, BulkImportStatus } from './repository'

type PersistedSummary = {
  insertedCount?: unknown
  failedCount?: unknown
  completedAt?: unknown
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function toIso(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  return parsed.toISOString()
}

function readErrors(row: BulkImportRowRecord): string[] {
  const payloadErrors = row.payload.errors

  if (Array.isArray(payloadErrors)) {
    return payloadErrors.filter((error): error is string => typeof error === 'string')
  }

  if (row.error_message) {
    return [row.error_message]
  }

  return []
}

function readSessionId(row: BulkImportRowRecord): string | null {
  const payloadSessionId = row.payload.sessionId
  return typeof payloadSessionId === 'string' ? payloadSessionId : null
}

function normalizeStatus(status: string): BulkImportStatus {
  if (status === 'completed' || status === 'completed_with_errors' || status === 'failed') {
    return status
  }

  return 'failed'
}

export function presentBulkImportResult(input: {
  importRecord: BulkImportRecord
  rowRecords: BulkImportRowRecord[]
  replayed: boolean
}) {
  const summary = (input.importRecord.result_summary ?? {}) as PersistedSummary
  const fallbackCompletedAt = input.importRecord.updated_at.toISOString()

  return {
    import: {
      id: input.importRecord.id,
      clientImportId: input.importRecord.client_import_id,
      status: normalizeStatus(input.importRecord.status),
      insertedCount: toNumber(summary.insertedCount),
      failedCount: toNumber(summary.failedCount),
      replayed: input.replayed,
      createdAt: input.importRecord.created_at.toISOString(),
      completedAt: toIso(summary.completedAt, fallbackCompletedAt),
    },
    rows: input.rowRecords.map((row) => ({
      rowNumber: row.row_number,
      status: row.status,
      sessionId: readSessionId(row),
      errors: readErrors(row),
    })),
  }
}

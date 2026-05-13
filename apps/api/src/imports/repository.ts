import type { PoolClient, QueryResultRow } from 'pg'

export type BulkImportStatus = 'pending' | 'completed' | 'completed_with_errors' | 'failed'

export type BulkImportRecord = QueryResultRow & {
  id: string
  creator_id: string
  client_import_id: string
  status: BulkImportStatus
  result_summary: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

export type BulkImportRowRecord = QueryResultRow & {
  id: string
  creator_id: string
  bulk_import_id: string
  row_number: number
  status: 'inserted' | 'failed'
  error_message: string | null
  payload: Record<string, unknown>
  created_at: Date
}

export async function insertBulkImport(
  client: PoolClient,
  input: { clientImportId: string }
): Promise<BulkImportRecord | null> {
  const result = await client.query<BulkImportRecord>(
    `
      insert into public.bulk_imports (client_import_id, status)
      values ($1, 'pending')
      on conflict (creator_id, client_import_id) do nothing
      returning id, creator_id, client_import_id, status, result_summary, created_at, updated_at
    `,
    [input.clientImportId]
  )

  return result.rows[0] ?? null
}

export async function findBulkImportByClientImportId(
  client: PoolClient,
  clientImportId: string
): Promise<BulkImportRecord | null> {
  const result = await client.query<BulkImportRecord>(
    `
      select id, creator_id, client_import_id, status, result_summary, created_at, updated_at
      from public.bulk_imports
      where client_import_id = $1
      limit 1
    `,
    [clientImportId]
  )

  return result.rows[0] ?? null
}

export async function listBulkImportRowsByImportId(
  client: PoolClient,
  bulkImportId: string
): Promise<BulkImportRowRecord[]> {
  const result = await client.query<BulkImportRowRecord>(
    `
      select id, creator_id, bulk_import_id, row_number, status, error_message, payload, created_at
      from public.bulk_import_rows
      where bulk_import_id = $1
      order by row_number asc
    `,
    [bulkImportId]
  )

  return result.rows
}

export async function insertBulkImportRow(
  client: PoolClient,
  input: {
    bulkImportId: string
    rowNumber: number
    status: 'inserted' | 'failed'
    errorMessage: string | null
    payload: Record<string, unknown>
  }
): Promise<void> {
  await client.query(
    `
      insert into public.bulk_import_rows (bulk_import_id, row_number, status, error_message, payload)
      values ($1, $2, $3, $4, $5::jsonb)
    `,
    [input.bulkImportId, input.rowNumber, input.status, input.errorMessage, JSON.stringify(input.payload)]
  )
}

export async function getProgramSessionMaxPosition(
  client: PoolClient,
  programId: string
): Promise<number> {
  const result = await client.query<{ max_position: number | null }>(
    `
      select coalesce(max(position), 0) as max_position
      from public.sessions
      where program_id = $1
    `,
    [programId]
  )

  return result.rows[0]?.max_position ?? 0
}

export async function insertImportedSession(
  client: PoolClient,
  input: {
    programId: string
    title: string
    description: string
    durationSeconds: number
    position: number
    instructorName: string
    tags: string[]
    mediaUrl: string | null
    mediaType: 'audio' | 'video' | null
  }
): Promise<{ id: string }> {
  const result = await client.query<{ id: string }>(
    `
      insert into public.sessions (
        program_id,
        title,
        description,
        duration_seconds,
        position,
        instructor_name,
        tags,
        media_url,
        media_type
      )
      values ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9)
      returning id
    `,
    [
      input.programId,
      input.title,
      input.description,
      input.durationSeconds,
      input.position,
      input.instructorName,
      input.tags,
      input.mediaUrl,
      input.mediaType,
    ]
  )

  return result.rows[0]
}

export async function updateBulkImportCompletion(
  client: PoolClient,
  input: {
    bulkImportId: string
    status: BulkImportStatus
    resultSummary: Record<string, unknown>
  }
): Promise<BulkImportRecord> {
  const result = await client.query<BulkImportRecord>(
    `
      update public.bulk_imports
      set status = $2,
          result_summary = $3::jsonb
      where id = $1
      returning id, creator_id, client_import_id, status, result_summary, created_at, updated_at
    `,
    [input.bulkImportId, input.status, JSON.stringify(input.resultSummary)]
  )

  return result.rows[0]
}

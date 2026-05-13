import type { PoolClient } from 'pg'

import type { SessionRecord } from './presenters'

export type SessionMutableFields = {
  title: string
  description: string
  durationSeconds: number | null
  position: number
  instructorName: string | null
  tags: string[]
  mediaUrl: string | null
  mediaType: 'audio' | 'video' | null
}

export async function listSessionsByProgram(client: PoolClient, programId: string): Promise<SessionRecord[]> {
  const result = await client.query<SessionRecord>(
    `
      select
        id,
        creator_id,
        program_id,
        title,
        description,
        duration_seconds,
        position,
        instructor_name,
        tags,
        media_url,
        media_type,
        created_at,
        updated_at
      from public.sessions
      where program_id = $1
      order by position asc, created_at asc, id asc
    `,
    [programId]
  )

  return result.rows
}

export async function findSessionById(client: PoolClient, sessionId: string): Promise<SessionRecord | null> {
  const result = await client.query<SessionRecord>(
    `
      select
        id,
        creator_id,
        program_id,
        title,
        description,
        duration_seconds,
        position,
        instructor_name,
        tags,
        media_url,
        media_type,
        created_at,
        updated_at
      from public.sessions
      where id = $1
      limit 1
    `,
    [sessionId]
  )

  return result.rows[0] ?? null
}

export async function getProgramSessionStats(
  client: PoolClient,
  programId: string
): Promise<{ count: number; maxPosition: number }> {
  const result = await client.query<{ count: string; max_position: number | null }>(
    `
      select count(*)::text as count, coalesce(max(position), 0) as max_position
      from public.sessions
      where program_id = $1
    `,
    [programId]
  )

  return {
    count: Number(result.rows[0]?.count ?? '0'),
    maxPosition: result.rows[0]?.max_position ?? 0,
  }
}

export async function createSession(
  client: PoolClient,
  input: Omit<SessionMutableFields, 'position'> & { programId: string; position: number }
): Promise<SessionRecord> {
  const result = await client.query<SessionRecord>(
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
      returning
        id,
        creator_id,
        program_id,
        title,
        description,
        duration_seconds,
        position,
        instructor_name,
        tags,
        media_url,
        media_type,
        created_at,
        updated_at
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

export async function updateSession(
  client: PoolClient,
  input: { sessionId: string } & SessionMutableFields
): Promise<SessionRecord | null> {
  const result = await client.query<SessionRecord>(
    `
      update public.sessions
      set title = $2,
          description = $3,
          duration_seconds = $4,
          position = $5,
          instructor_name = $6,
          tags = $7::text[],
          media_url = $8,
          media_type = $9
      where id = $1
      returning
        id,
        creator_id,
        program_id,
        title,
        description,
        duration_seconds,
        position,
        instructor_name,
        tags,
        media_url,
        media_type,
        created_at,
        updated_at
    `,
    [
      input.sessionId,
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

  return result.rows[0] ?? null
}

export async function deleteSession(
  client: PoolClient,
  sessionId: string
): Promise<Pick<SessionRecord, 'id' | 'program_id' | 'title' | 'position'> | null> {
  const result = await client.query<Pick<SessionRecord, 'id' | 'program_id' | 'title' | 'position'>>(
    `
      delete from public.sessions
      where id = $1
      returning id, program_id, title, position
    `,
    [sessionId]
  )

  return result.rows[0] ?? null
}

export async function addTemporaryOffsetToSessionsAtOrAfter(
  client: PoolClient,
  input: { programId: string; fromPosition: number; offset: number }
): Promise<void> {
  await client.query(
    `
      update public.sessions
      set position = position + $3
      where program_id = $1
        and position >= $2
    `,
    [input.programId, input.fromPosition, input.offset]
  )
}

export async function finalizeShiftedSessionsUp(
  client: PoolClient,
  input: { programId: string; thresholdPosition: number; offset: number }
): Promise<void> {
  await client.query(
    `
      update public.sessions
      set position = position - $3 + 1
      where program_id = $1
        and position >= $2
    `,
    [input.programId, input.thresholdPosition, input.offset]
  )
}

export async function addTemporaryOffsetToSessionsAfter(
  client: PoolClient,
  input: { programId: string; afterPosition: number; offset: number }
): Promise<void> {
  await client.query(
    `
      update public.sessions
      set position = position + $3
      where program_id = $1
        and position > $2
    `,
    [input.programId, input.afterPosition, input.offset]
  )
}

export async function finalizeShiftedSessionsDown(
  client: PoolClient,
  input: { programId: string; thresholdPosition: number; offset: number }
): Promise<void> {
  await client.query(
    `
      update public.sessions
      set position = position - $3 - 1
      where program_id = $1
        and position >= $2
    `,
    [input.programId, input.thresholdPosition, input.offset]
  )
}

export async function addTemporaryOffsetToProgramSessions(
  client: PoolClient,
  input: { programId: string; offset: number }
): Promise<void> {
  await client.query(
    `
      update public.sessions
      set position = position + $2
      where program_id = $1
    `,
    [input.programId, input.offset]
  )
}

export async function setProgramSessionOrder(
  client: PoolClient,
  input: { sessionIds: string[] }
): Promise<void> {
  await client.query(
    `
      with ordered_sessions as (
        select session_id, ordinality::integer as new_position
        from unnest($1::uuid[]) with ordinality as ordered(session_id, ordinality)
      )
      update public.sessions as sessions
      set position = ordered_sessions.new_position
      from ordered_sessions
      where sessions.id = ordered_sessions.session_id
    `,
    [input.sessionIds]
  )
}

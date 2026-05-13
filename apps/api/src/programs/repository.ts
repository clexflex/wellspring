import type { PoolClient } from 'pg'

import type { ProgramRecord } from './presenters'

export async function listPrograms(
  client: PoolClient,
  input: { limit: number; offset: number }
): Promise<ProgramRecord[]> {
  const result = await client.query<ProgramRecord>(
    `
      select id, creator_id, title, description, created_at, updated_at
      from public.programs
      order by updated_at desc, id desc
      limit $1
      offset $2
    `,
    [input.limit, input.offset]
  )

  return result.rows
}

export async function findProgramById(client: PoolClient, programId: string): Promise<ProgramRecord | null> {
  const result = await client.query<ProgramRecord>(
    `
      select id, creator_id, title, description, created_at, updated_at
      from public.programs
      where id = $1
      limit 1
    `,
    [programId]
  )

  return result.rows[0] ?? null
}

export async function createProgram(
  client: PoolClient,
  input: { title: string; description: string }
): Promise<ProgramRecord> {
  const result = await client.query<ProgramRecord>(
    `
      insert into public.programs (title, description)
      values ($1, $2)
      returning id, creator_id, title, description, created_at, updated_at
    `,
    [input.title, input.description]
  )

  return result.rows[0]
}

export async function updateProgram(
  client: PoolClient,
  input: { programId: string; title: string; description: string }
): Promise<ProgramRecord | null> {
  const result = await client.query<ProgramRecord>(
    `
      update public.programs
      set title = $2,
          description = $3
      where id = $1
      returning id, creator_id, title, description, created_at, updated_at
    `,
    [input.programId, input.title, input.description]
  )

  return result.rows[0] ?? null
}

export async function deleteProgram(
  client: PoolClient,
  programId: string
): Promise<Pick<ProgramRecord, 'id' | 'title'> | null> {
  const result = await client.query<Pick<ProgramRecord, 'id' | 'title'>>(
    `
      delete from public.programs
      where id = $1
      returning id, title
    `,
    [programId]
  )

  return result.rows[0] ?? null
}

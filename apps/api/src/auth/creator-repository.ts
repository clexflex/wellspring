import type { QueryResultRow } from 'pg'

import { getRuntimePool } from '../db/pool'

export type CreatorRecord = QueryResultRow & {
  id: string
  email: string
  password_hash: string
  display_name: string
  slug: string
  created_at: Date
  updated_at: Date
}

export async function findCreatorByEmail(email: string): Promise<CreatorRecord | null> {
  const result = await getRuntimePool().query<CreatorRecord>(
    `
      select id, email, password_hash, display_name, slug, created_at, updated_at
      from public.creators
      where lower(email) = $1
      limit 1
    `,
    [email]
  )

  return result.rows[0] ?? null
}

export async function findCreatorById(id: string): Promise<CreatorRecord | null> {
  const result = await getRuntimePool().query<CreatorRecord>(
    `
      select id, email, password_hash, display_name, slug, created_at, updated_at
      from public.creators
      where id = $1
      limit 1
    `,
    [id]
  )

  return result.rows[0] ?? null
}

export async function createCreator(input: {
  email: string
  passwordHash: string
  displayName: string
  slug: string
}): Promise<CreatorRecord> {
  const result = await getRuntimePool().query<CreatorRecord>(
    `
      insert into public.creators (email, password_hash, display_name, slug)
      values ($1, $2, $3, $4)
      returning id, email, password_hash, display_name, slug, created_at, updated_at
    `,
    [input.email, input.passwordHash, input.displayName, input.slug]
  )

  return result.rows[0]
}

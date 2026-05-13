import { hashResetToken } from '../auth/hash'
import { hashPassword } from '../auth/passwords'
import { getAdminPool } from './admin'

export async function resetDatabase(): Promise<void> {
  const adminPool = getAdminPool()

  await adminPool.query(
    'truncate table public.audit_logs, public.password_reset_tokens, public.sessions, public.programs, public.creators restart identity cascade'
  )
}

export async function seedIsolationFixtures({
  creatorOneId,
  creatorTwoId,
}: {
  creatorOneId: string
  creatorTwoId: string
}): Promise<void> {
  const adminPool = getAdminPool()

  await adminPool.query(
    `
      insert into public.creators (id, email, password_hash, display_name, slug)
      values
        ($1, 'creator-one@example.com', 'hash-1', 'Creator One', 'creator-one'),
        ($2, 'creator-two@example.com', 'hash-2', 'Creator Two', 'creator-two')
      on conflict (id) do update set display_name = excluded.display_name
    `,
    [creatorOneId, creatorTwoId]
  )

  await adminPool.query(
    `
      insert into public.programs (id, creator_id, title, description)
      values
        (gen_random_uuid(), $1, 'Program One', 'Program One'),
        (gen_random_uuid(), $2, 'Program Two', 'Program Two')
    `,
    [creatorOneId, creatorTwoId]
  )
}

export async function seedCreatorWithPassword(input: {
  email: string
  password: string
  displayName: string
  slug: string
}): Promise<{ id: string; email: string; slug: string }> {
  const adminPool = getAdminPool()
  const passwordHash = await hashPassword(input.password)
  const result = await adminPool.query<{ id: string; email: string; slug: string }>(
    `
      insert into public.creators (email, password_hash, display_name, slug)
      values ($1, $2, $3, $4)
      returning id, email, slug
    `,
    [input.email.toLowerCase(), passwordHash, input.displayName, input.slug]
  )

  return result.rows[0]
}

export async function cleanupAuthFixtures(emails: string[]): Promise<void> {
  if (emails.length === 0) {
    return
  }

  const adminPool = getAdminPool()
  await adminPool.query('delete from public.creators where lower(email) = any($1::text[])', [
    emails.map((email) => email.toLowerCase()),
  ])
}

export async function findPasswordResetTokenByCreator(creatorId: string) {
  const adminPool = getAdminPool()
  const result = await adminPool.query<{
    id: string
    creator_id: string
    token_hash: string
    expires_at: Date
    used_at: Date | null
    created_at: Date
  }>(
    `
      select id, creator_id, token_hash, expires_at, used_at, created_at
      from public.password_reset_tokens
      where creator_id = $1
      order by created_at desc
      limit 1
    `,
    [creatorId]
  )

  return result.rows[0] ?? null
}

export async function findLatestAuditLogByCreator(creatorId: string) {
  const adminPool = getAdminPool()
  const result = await adminPool.query<{
    id: string
    creator_id: string
    actor_creator_id: string
    action: string
    target_type: string
    target_id: string
    metadata: Record<string, unknown>
    created_at: Date
  }>(
    `
      select id, creator_id, actor_creator_id, action, target_type, target_id, metadata, created_at
      from public.audit_logs
      where creator_id = $1
      order by created_at desc, id desc
      limit 1
    `,
    [creatorId]
  )

  return result.rows[0] ?? null
}

export async function createProgramFixture(input: {
  creatorId: string
  title: string
  description: string
  updatedAt?: Date | string
}): Promise<{ id: string; creator_id: string; title: string; description: string; updated_at: Date }> {
  const adminPool = getAdminPool()
  const result = await adminPool.query<{
    id: string
    creator_id: string
    title: string
    description: string
    updated_at: Date
  }>(
    `
      insert into public.programs (creator_id, title, description, updated_at)
      values ($1, $2, $3, coalesce($4::timestamptz, now()))
      returning id, creator_id, title, description, updated_at
    `,
    [input.creatorId, input.title, input.description, input.updatedAt ? new Date(input.updatedAt) : null]
  )

  return result.rows[0]
}

export async function findProgramById(programId: string) {
  const adminPool = getAdminPool()
  const result = await adminPool.query<{
    id: string
    creator_id: string
    title: string
    description: string
    created_at: Date
    updated_at: Date
  }>(
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

export async function createSessionFixture(input: {
  creatorId: string
  programId: string
  title: string
  description?: string
  position: number
  durationSeconds?: number | null
  instructorName?: string | null
  tags?: string[]
  mediaUrl?: string | null
  mediaType?: 'audio' | 'video' | null
  createdAt?: Date | string
  updatedAt?: Date | string
}): Promise<{
  id: string
  creator_id: string
  program_id: string
  title: string
  description: string
  duration_seconds: number | null
  position: number
  instructor_name: string | null
  tags: string[]
  media_url: string | null
  media_type: 'audio' | 'video' | null
  created_at: Date
  updated_at: Date
}> {
  const adminPool = getAdminPool()
  const result = await adminPool.query<{
    id: string
    creator_id: string
    program_id: string
    title: string
    description: string
    duration_seconds: number | null
    position: number
    instructor_name: string | null
    tags: string[]
    media_url: string | null
    media_type: 'audio' | 'video' | null
    created_at: Date
    updated_at: Date
  }>(
    `
      insert into public.sessions (
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
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10, coalesce($11::timestamptz, now()), coalesce($12::timestamptz, now()))
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
      input.creatorId,
      input.programId,
      input.title,
      input.description ?? '',
      input.durationSeconds ?? null,
      input.position,
      input.instructorName ?? null,
      input.tags ?? [],
      input.mediaUrl ?? null,
      input.mediaType ?? null,
      input.createdAt ? new Date(input.createdAt) : null,
      input.updatedAt ? new Date(input.updatedAt) : null,
    ]
  )

  return result.rows[0]
}

export async function findSessionById(sessionId: string) {
  const adminPool = getAdminPool()
  const result = await adminPool.query<{
    id: string
    creator_id: string
    program_id: string
    title: string
    description: string
    duration_seconds: number | null
    position: number
    instructor_name: string | null
    tags: string[]
    media_url: string | null
    media_type: 'audio' | 'video' | null
    created_at: Date
    updated_at: Date
  }>(
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

export async function listSessionsByProgram(programId: string) {
  const adminPool = getAdminPool()
  const result = await adminPool.query<{
    id: string
    creator_id: string
    program_id: string
    title: string
    description: string
    duration_seconds: number | null
    position: number
    instructor_name: string | null
    tags: string[]
    media_url: string | null
    media_type: 'audio' | 'video' | null
    created_at: Date
    updated_at: Date
  }>(
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

export async function createAuditLog(input: {
  creatorId: string
  actorCreatorId?: string
  action: string
  targetType: string
  targetId?: string
  metadata?: Record<string, unknown>
  createdAt?: Date | string
}): Promise<{ id: string }> {
  const adminPool = getAdminPool()
  const result = await adminPool.query<{ id: string }>(
    `
      insert into public.audit_logs (
        creator_id,
        actor_creator_id,
        action,
        target_type,
        target_id,
        metadata,
        created_at
      )
      values ($1, $2, $3, $4, coalesce($5::uuid, gen_random_uuid()), $6::jsonb, coalesce($7::timestamptz, now()))
      returning id
    `,
    [
      input.creatorId,
      input.actorCreatorId ?? input.creatorId,
      input.action,
      input.targetType,
      input.targetId ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.createdAt ? new Date(input.createdAt) : null,
    ]
  )

  return result.rows[0]
}

export async function createExpiredPasswordResetToken(creatorId: string): Promise<string> {
  const adminPool = getAdminPool()
  const rawToken = 'expired-reset-token'

  await adminPool.query(
    `
      insert into public.password_reset_tokens (creator_id, token_hash, expires_at)
      values ($1, $2, $3)
    `,
    [creatorId, hashResetToken(rawToken), new Date(Date.now() - 60_000)]
  )

  return rawToken
}

export async function createUsedPasswordResetToken(creatorId: string): Promise<string> {
  const adminPool = getAdminPool()
  const rawToken = 'used-reset-token'

  await adminPool.query(
    `
      insert into public.password_reset_tokens (creator_id, token_hash, expires_at, used_at)
      values ($1, $2, $3, $4)
    `,
    [creatorId, hashResetToken(rawToken), new Date(Date.now() + 60_000), new Date()]
  )

  return rawToken
}

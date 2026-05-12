import { hashResetToken } from '../auth/hash'
import { hashPassword } from '../auth/passwords'
import { getAdminPool } from './admin'

export async function resetDatabase(): Promise<void> {
  const adminPool = getAdminPool()

  await adminPool.query(
    'truncate table public.password_reset_tokens, public.sessions, public.programs, public.creators restart identity cascade'
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

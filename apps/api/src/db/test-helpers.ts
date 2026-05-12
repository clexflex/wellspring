import { getAdminPool } from './admin'

export async function resetDatabase(): Promise<void> {
  const adminPool = getAdminPool()

  await adminPool.query('truncate table public.sessions, public.programs, public.creators restart identity cascade')
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

import { getAdminPool } from '../db/admin'
import { seedCreators } from './seed-data'

async function main() {
  const adminPool = getAdminPool()
  const client = await adminPool.connect()

  try {
    await client.query('begin')

    const creatorIds = seedCreators.map((creator) => creator.id)
    const programIds = seedCreators.flatMap((creator) => creator.programs.map((program) => program.id))
    const sessionIds = seedCreators.flatMap((creator) =>
      creator.programs.flatMap((program) => program.sessions.map((session) => session.id))
    )

    await client.query('delete from public.sessions where id = any($1::uuid[])', [sessionIds])
    await client.query('delete from public.programs where id = any($1::uuid[])', [programIds])
    await client.query('delete from public.creators where id = any($1::uuid[])', [creatorIds])

    for (const creator of seedCreators) {
      await client.query(
        `
          insert into public.creators (id, email, password_hash, display_name, slug)
          values ($1, $2, $3, $4, $5)
        `,
        [creator.id, creator.email, creator.passwordHash, creator.displayName, creator.slug]
      )

      for (const program of creator.programs) {
        await client.query(
          `
            insert into public.programs (id, creator_id, title, description)
            values ($1, $2, $3, $4)
          `,
          [program.id, creator.id, program.title, program.description]
        )

        for (const session of program.sessions) {
          await client.query(
            `
              insert into public.sessions (id, creator_id, program_id, title, description, position)
              values ($1, $2, $3, $4, $5, $6)
            `,
            [session.id, creator.id, program.id, session.title, session.description, session.position]
          )
        }
      }
    }

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
    await adminPool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

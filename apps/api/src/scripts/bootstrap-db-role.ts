import { URL } from 'node:url'

import { getAdminPool } from '../db/admin'

const RUNTIME_ROLE = 'wellspring_app'

async function main() {
  const adminPool = getAdminPool()
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to bootstrap the runtime role password')
  }

  const parsedUrl = new URL(databaseUrl)
  const username = decodeURIComponent(parsedUrl.username)
  const password = decodeURIComponent(parsedUrl.password)

  if (username !== RUNTIME_ROLE) {
    throw new Error(`DATABASE_URL must use the ${RUNTIME_ROLE} role, received ${username}`)
  }

  if (!password) {
    throw new Error('DATABASE_URL must include the runtime role password')
  }

  await adminPool.query(`alter role ${RUNTIME_ROLE} login password '${password.replace(/'/g, "''")}'`)
  await adminPool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

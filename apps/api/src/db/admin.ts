import { Pool } from 'pg'

import { getEnv } from '../config/env'

let adminPool: Pool | null = null

function shouldUseSsl(connectionString: string): boolean {
  return !/localhost|127\.0\.0\.1/.test(connectionString)
}

export function getAdminPool(): Pool {
  if (!adminPool) {
    const { DATABASE_ADMIN_URL } = getEnv()

    adminPool = new Pool({
      connectionString: DATABASE_ADMIN_URL,
      ssl: shouldUseSsl(DATABASE_ADMIN_URL) ? { rejectUnauthorized: false } : false,
    })
  }

  return adminPool
}

export async function closeAdminPool(): Promise<void> {
  if (adminPool) {
    await adminPool.end()
    adminPool = null
  }
}

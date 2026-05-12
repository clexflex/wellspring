import { Pool } from 'pg'

import { getEnv } from '../config/env'

let runtimePool: Pool | null = null

function shouldUseSsl(connectionString: string): boolean {
  return !/localhost|127\.0\.0\.1/.test(connectionString)
}

export function getRuntimePool(): Pool {
  if (!runtimePool) {
    const { DATABASE_URL } = getEnv()

    runtimePool = new Pool({
      connectionString: DATABASE_URL,
      ssl: shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : false,
    })
  }

  return runtimePool
}

export async function closeRuntimePool(): Promise<void> {
  if (runtimePool) {
    await runtimePool.end()
    runtimePool = null
  }
}

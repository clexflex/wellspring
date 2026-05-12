import type { QueryResultRow } from 'pg'

import { getEnv } from '../config/env'
import { getRuntimePool } from '../db/pool'
import { withTenantContext } from '../db/tenant-context'

export type PasswordResetTokenRecord = QueryResultRow & {
  id: string
  creator_id: string
  token_hash: string
  expires_at: Date
  used_at: Date | null
  created_at: Date
}

export async function createPasswordResetToken(input: {
  creatorId: string
  tokenHash: string
}): Promise<void> {
  const expiresAt = new Date(Date.now() + getEnv().PASSWORD_RESET_TOKEN_EXPIRES_MINUTES * 60_000)

  await withTenantContext(input.creatorId, async (client) => {
    await client.query(
      `
        insert into public.password_reset_tokens (creator_id, token_hash, expires_at)
        values ($1, $2, $3)
      `,
      [input.creatorId, input.tokenHash, expiresAt]
    )
  })
}

export async function consumePasswordResetToken(input: {
  tokenHash: string
  newPasswordHash: string
}): Promise<boolean> {
  const result = await getRuntimePool().query<{ consumed: boolean }>(
    'select app.consume_password_reset_token($1, $2) as consumed',
    [input.tokenHash, input.newPasswordHash]
  )

  return result.rows[0]?.consumed === true
}

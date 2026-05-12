import { AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../audit/actions'
import { recordAuditLog } from '../audit/record'
import { getEnv } from '../config/env'
import { getRuntimePool } from '../db/pool'
import { setTenantContext, withTenantContext } from '../db/tenant-context'
import { AppError } from '../http/errors'
import { createCreator, findCreatorByEmail, findCreatorById, type CreatorRecord } from './creator-repository'
import { generateRawResetToken, hashResetToken } from './hash'
import { signCreatorToken } from './jwt'
import {
  consumePasswordResetTokenWithClient,
  insertPasswordResetToken,
} from './password-reset-repository'
import { hashPassword, verifyPassword } from './passwords'
import { presentCreator } from './presenters'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function mapCreatorConflict(error: unknown): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505' &&
    'constraint' in error
  ) {
    const constraint = String(error.constraint)

    if (constraint === 'creators_email_key') {
      throw new AppError(409, 'CONFLICT', 'Email is already in use')
    }

    if (constraint === 'creators_slug_key') {
      throw new AppError(409, 'CONFLICT', 'Slug is already in use')
    }
  }

  throw error
}

function buildAuthResponse(creator: CreatorRecord) {
  return {
    creator: presentCreator(creator),
    token: signCreatorToken({ creatorId: creator.id, email: creator.email }),
  }
}

export async function signupCreator(input: {
  email: string
  password: string
  displayName: string
  slug: string
}) {
  const email = normalizeEmail(input.email)
  const passwordHash = await hashPassword(input.password)

  try {
    const client = await getRuntimePool().connect()

    try {
      await client.query('begin')

      const creator = await createCreator(
        {
          email,
          passwordHash,
          displayName: input.displayName.trim(),
          slug: input.slug.trim(),
        },
        client
      )

      await setTenantContext(client, creator.id)
      await recordAuditLog(client, {
        actorCreatorId: creator.id,
        action: AUDIT_ACTIONS.CREATOR_SIGNED_UP,
        targetType: AUDIT_TARGET_TYPES.CREATOR,
        targetId: creator.id,
        metadata: {
          email: creator.email,
          slug: creator.slug,
        },
      })

      await client.query('commit')

      return buildAuthResponse(creator)
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    mapCreatorConflict(error)
  }
}

export async function loginCreator(input: { email: string; password: string }) {
  const creator = await findCreatorByEmail(normalizeEmail(input.email))

  if (!creator) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  const passwordMatches = await verifyPassword(input.password, creator.password_hash)

  if (!passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }

  return buildAuthResponse(creator)
}

export async function requestPasswordReset(input: { email: string }) {
  const creator = await findCreatorByEmail(normalizeEmail(input.email))

  if (!creator) {
    return { success: true as const }
  }

  const rawToken = generateRawResetToken()

  await withTenantContext(creator.id, async (client) => {
    await insertPasswordResetToken(client, {
      creatorId: creator.id,
      tokenHash: hashResetToken(rawToken),
    })

    await recordAuditLog(client, {
      actorCreatorId: creator.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      targetType: AUDIT_TARGET_TYPES.CREATOR,
      targetId: creator.id,
      metadata: {},
    })
  })

  if (getEnv().NODE_ENV === 'production') {
    return { success: true as const }
  }

  const resetUrl = `${getEnv().APP_ORIGIN}/reset-password?token=${rawToken}`

  return {
    success: true as const,
    debug: {
      resetToken: rawToken,
      resetUrl,
    },
  }
}

export async function confirmPasswordReset(input: { token: string; newPassword: string }) {
  const client = await getRuntimePool().connect()

  try {
    await client.query('begin')

    const creatorId = await consumePasswordResetTokenWithClient(client, {
      tokenHash: hashResetToken(input.token),
      newPasswordHash: await hashPassword(input.newPassword),
    })

    if (!creatorId) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Password reset token is invalid or expired')
    }

    await setTenantContext(client, creatorId)
    await recordAuditLog(client, {
      actorCreatorId: creatorId,
      action: AUDIT_ACTIONS.PASSWORD_RESET_CONFIRMED,
      targetType: AUDIT_TARGET_TYPES.CREATOR,
      targetId: creatorId,
      metadata: {},
    })

    await client.query('commit')
    return { success: true as const }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function getCurrentCreatorProfile(creatorId: string) {
  const creator = await findCreatorById(creatorId)

  if (!creator) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required')
  }

  return { creator: presentCreator(creator) }
}

import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'

import { getEnv } from '../config/env'
import { AppError } from '../http/errors'

export type CreatorJwtPayload = JwtPayload & {
  sub: string
  email: string
  type: 'creator'
}

export function signCreatorToken(input: { creatorId: string; email: string }): string {
  const env = getEnv()
  const payload: CreatorJwtPayload = {
    sub: input.creatorId,
    email: input.email,
    type: 'creator',
  }

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  })
}

export function verifyCreatorToken(token: string): CreatorJwtPayload {
  const env = getEnv()
  const decoded = jwt.verify(token, env.JWT_SECRET)

  if (typeof decoded !== 'object' || !decoded) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token')
  }

  const payload = decoded as Partial<CreatorJwtPayload>

  if (payload.type !== 'creator' || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token')
  }

  return payload as CreatorJwtPayload
}

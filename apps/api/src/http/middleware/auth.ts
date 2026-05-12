import type { NextFunction, Request, Response } from 'express'

import { verifyCreatorToken } from '../../auth/jwt'
import { AppError } from '../errors'

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization

  if (!authorization) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'))
    return
  }

  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'))
    return
  }

  try {
    const payload = verifyCreatorToken(token)
    req.auth = {
      creatorId: payload.sub,
      email: payload.email,
    }
    req.tenantId = payload.sub
    next()
  } catch (error) {
    next(error)
  }
}

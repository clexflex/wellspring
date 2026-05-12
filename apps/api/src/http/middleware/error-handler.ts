import type { NextFunction, Request, Response } from 'express'

import { isAppError } from '../errors'

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      details: {},
    },
  })
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isAppError(error)) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    })
    return
  }

  const message = error instanceof Error ? error.message : 'Unexpected error'

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      details: {},
    },
  })
}

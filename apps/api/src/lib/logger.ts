import { randomUUID } from 'node:crypto'

import type { RequestHandler } from 'express'
import pino from 'pino'

const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
})

function getRequestLogLevel(statusCode: number): 'error' | 'warn' | 'info' {
  if (statusCode >= 500) {
    return 'error'
  }

  if (statusCode >= 400) {
    return 'warn'
  }

  return 'info'
}

export const httpLogger: RequestHandler = (req, res, next) => {
  const existing = req.headers['x-request-id']
  const requestId = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID()

  req.id = requestId
  res.setHeader('x-request-id', requestId)

  res.on('finish', () => {
    logger[getRequestLogLevel(res.statusCode)](
      {
        request_id: requestId,
        tenant_id: req.tenantId ?? null,
        method: req.method,
        path: req.originalUrl || req.url,
        status_code: res.statusCode,
      },
      'request completed'
    )
  })

  next()
}

export { logger }

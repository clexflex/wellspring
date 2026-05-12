import pino from 'pino'
import pinoHttp from 'pino-http'

const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
})

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id']
    const requestId = typeof existing === 'string' && existing.length > 0 ? existing : crypto.randomUUID()
    res.setHeader('x-request-id', requestId)
    return requestId
  },
  customProps: (req, res) => ({
    request_id: req.id,
    tenant_id: (req as { tenantId?: string | null }).tenantId ?? null,
    method: req.method,
    path: req.url,
    status_code: res.statusCode || null,
  }),
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) {
      return 'error'
    }

    if (res.statusCode >= 400) {
      return 'warn'
    }

    return 'info'
  },
})

export { logger }

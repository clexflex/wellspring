import cors from 'cors'
import express from 'express'

import { getEnv } from './config/env'
import { errorHandler, notFoundHandler } from './http/middleware/error-handler'
import { createAuthRouter } from './http/routes/auth'
import { createAuditLogsRouter } from './http/routes/audit-logs'
import { createHealthRouter } from './http/routes/health'
import { createImportsRouter } from './http/routes/imports'
import { createProgramsRouter } from './http/routes/programs'
import { createSessionsRouter } from './http/routes/sessions'
import { createUploadsRouter } from './http/routes/uploads'
import { httpLogger } from './lib/logger'

export function createApp() {
  const app = express()
  const env = getEnv()

  app.use(
    cors({
      origin: env.APP_ORIGIN,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      optionsSuccessStatus: 204,
    })
  )
  app.use(httpLogger)
  app.use(express.json())

  app.use('/health', createHealthRouter())
  app.use('/api/auth', createAuthRouter())
  app.use('/api/audit-logs', createAuditLogsRouter())
  app.use('/api/programs', createProgramsRouter())
  app.use('/api', createImportsRouter())
  app.use('/api', createUploadsRouter())
  app.use('/api', createSessionsRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

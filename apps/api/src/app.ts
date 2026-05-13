import express from 'express'

import { errorHandler, notFoundHandler } from './http/middleware/error-handler'
import { createAuthRouter } from './http/routes/auth'
import { createAuditLogsRouter } from './http/routes/audit-logs'
import { createHealthRouter } from './http/routes/health'
import { createProgramsRouter } from './http/routes/programs'
import { createSessionsRouter } from './http/routes/sessions'
import { httpLogger } from './lib/logger'

export function createApp() {
  const app = express()

  app.use(httpLogger)
  app.use(express.json())

  app.use('/health', createHealthRouter())
  app.use('/api/auth', createAuthRouter())
  app.use('/api/audit-logs', createAuditLogsRouter())
  app.use('/api/programs', createProgramsRouter())
  app.use('/api', createSessionsRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

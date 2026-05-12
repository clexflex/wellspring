import express from 'express'

import { errorHandler, notFoundHandler } from './http/middleware/error-handler'
import { createAuthRouter } from './http/routes/auth'
import { createHealthRouter } from './http/routes/health'
import { httpLogger } from './lib/logger'

export function createApp() {
  const app = express()

  app.use(httpLogger)
  app.use(express.json())

  app.use('/health', createHealthRouter())
  app.use('/api/auth', createAuthRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

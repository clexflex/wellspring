import express from 'express'

import { errorHandler, notFoundHandler } from './http/middleware/error-handler'
import { createHealthRouter } from './http/routes/health'
import { httpLogger } from './lib/logger'

export function createApp() {
  const app = express()

  app.use(httpLogger)
  app.use(express.json())

  app.use('/health', createHealthRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

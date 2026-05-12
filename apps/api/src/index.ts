import { createServer } from 'node:http'

import { createApp } from './app'
import { getEnv } from './config/env'
import { logger } from './lib/logger'

const env = getEnv()
const app = createApp()
const server = createServer(app)

server.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'API listening')
})

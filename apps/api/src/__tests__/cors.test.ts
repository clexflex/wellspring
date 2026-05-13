import request from 'supertest'
import { afterAll, describe, expect, test } from 'vitest'

import { createApp } from '../app'
import { closeAdminPool } from '../db/admin'
import { closeRuntimePool } from '../db/pool'

const app = createApp()

afterAll(async () => {
  await closeRuntimePool()
  await closeAdminPool()
})

describe('CORS middleware', () => {
  test('responds to browser preflight requests from APP_ORIGIN', async () => {
    const response = await request(app)
      .options('/api/auth/login')
      .set('origin', 'http://localhost:3000')
      .set('access-control-request-method', 'POST')
      .set('access-control-request-headers', 'authorization,content-type,x-request-id')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    expect(response.headers['access-control-allow-methods']).toContain('POST')
    expect(response.headers['access-control-allow-headers']).toContain('Authorization')
    expect(response.headers['vary']).toContain('Origin')
  })
})

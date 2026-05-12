import request from 'supertest'
import { describe, expect, test } from 'vitest'

import { createApp } from '../app'

describe('GET /health', () => {
  test('returns 200 and status ok', async () => {
    const app = createApp()

    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})

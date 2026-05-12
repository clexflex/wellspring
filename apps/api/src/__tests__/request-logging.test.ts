import request from 'supertest'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { createApp } from '../app'
import { logger } from '../lib/logger'

const app = createApp()

afterEach(() => {
  vi.restoreAllMocks()
})

describe('request logging', () => {
  test('emits one correct top-level request log shape', async () => {
    const infoSpy = vi.spyOn(logger, 'info')

    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(infoSpy).toHaveBeenCalled()

    const [payload] = infoSpy.mock.calls.at(-1) ?? []

    expect(payload).toEqual(
      expect.objectContaining({
        request_id: expect.any(String),
        tenant_id: null,
        method: 'GET',
        path: '/health',
        status_code: 200,
      })
    )
  })
})

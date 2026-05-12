import { describe, expect, test } from 'vitest'

import { loadEnv } from '../config/env'

describe('loadEnv', () => {
  test('fails when DATABASE_URL is missing', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        API_PORT: '4000',
        APP_ORIGIN: 'http://localhost:3000',
        DATABASE_ADMIN_URL: 'postgresql://admin:admin@localhost:5432/wellspring',
      })
    ).toThrow(/DATABASE_URL/)
  })

  test('fails when DATABASE_ADMIN_URL is missing', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        API_PORT: '4000',
        APP_ORIGIN: 'http://localhost:3000',
        DATABASE_URL: 'postgresql://runtime:runtime@localhost:5432/wellspring',
      })
    ).toThrow(/DATABASE_ADMIN_URL/)
  })

  test('fails when API_PORT is invalid', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        API_PORT: 'port',
        APP_ORIGIN: 'http://localhost:3000',
        DATABASE_URL: 'postgresql://runtime:runtime@localhost:5432/wellspring',
        DATABASE_ADMIN_URL: 'postgresql://admin:admin@localhost:5432/wellspring',
      })
    ).toThrow(/API_PORT/)
  })
})

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

  test('fails when JWT_SECRET is missing', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        API_PORT: '4000',
        APP_ORIGIN: 'http://localhost:3000',
        DATABASE_URL: 'postgresql://runtime:runtime@localhost:5432/wellspring',
        DATABASE_ADMIN_URL: 'postgresql://admin:admin@localhost:5432/wellspring',
        JWT_EXPIRES_IN: '7d',
        PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: '30',
      })
    ).toThrow(/JWT_SECRET/)
  })

  test('fails when JWT_EXPIRES_IN is missing', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        API_PORT: '4000',
        APP_ORIGIN: 'http://localhost:3000',
        DATABASE_URL: 'postgresql://runtime:runtime@localhost:5432/wellspring',
        DATABASE_ADMIN_URL: 'postgresql://admin:admin@localhost:5432/wellspring',
        JWT_SECRET: 'test-secret',
        PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: '30',
      })
    ).toThrow(/JWT_EXPIRES_IN/)
  })

  test('fails when PASSWORD_RESET_TOKEN_EXPIRES_MINUTES is missing', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        API_PORT: '4000',
        APP_ORIGIN: 'http://localhost:3000',
        DATABASE_URL: 'postgresql://runtime:runtime@localhost:5432/wellspring',
        DATABASE_ADMIN_URL: 'postgresql://admin:admin@localhost:5432/wellspring',
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '7d',
      })
    ).toThrow(/PASSWORD_RESET_TOKEN_EXPIRES_MINUTES/)
  })
})

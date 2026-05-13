import { describe, expect, test } from 'vitest'

import { loadEnv } from '../config/env'

function buildBaseEnv() {
  return {
    NODE_ENV: 'test',
    API_PORT: '4000',
    APP_ORIGIN: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://runtime:runtime@localhost:5432/wellspring',
    DATABASE_ADMIN_URL: 'postgresql://admin:admin@localhost:5432/wellspring',
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '7d',
    PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: '30',
    AWS_ACCESS_KEY_ID: 'test-access-key-id',
    AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
    AWS_REGION: 'us-east-1',
    AWS_S3_BUCKET: 'test-bucket',
    S3_PUBLIC_BASE_URL: 'https://cdn.example.com',
    S3_PRESIGNED_URL_EXPIRES_SECONDS: '300',
    MAX_MEDIA_UPLOAD_BYTES: '524288000',
  }
}

describe('loadEnv', () => {
  test('fails when DATABASE_URL is missing', () => {
    expect(() =>
      loadEnv({
        ...buildBaseEnv(),
        DATABASE_URL: undefined,
      })
    ).toThrow(/DATABASE_URL/)
  })

  test('fails when DATABASE_ADMIN_URL is missing', () => {
    expect(() =>
      loadEnv({
        ...buildBaseEnv(),
        DATABASE_ADMIN_URL: undefined,
      })
    ).toThrow(/DATABASE_ADMIN_URL/)
  })

  test('fails when API_PORT is invalid', () => {
    expect(() =>
      loadEnv({
        ...buildBaseEnv(),
        API_PORT: 'port',
      })
    ).toThrow(/API_PORT/)
  })

  test('fails when JWT_SECRET is missing', () => {
    expect(() =>
      loadEnv({
        ...buildBaseEnv(),
        JWT_SECRET: undefined,
      })
    ).toThrow(/JWT_SECRET/)
  })

  test('fails when JWT_EXPIRES_IN is missing', () => {
    expect(() =>
      loadEnv({
        ...buildBaseEnv(),
        JWT_EXPIRES_IN: undefined,
      })
    ).toThrow(/JWT_EXPIRES_IN/)
  })

  test('fails when PASSWORD_RESET_TOKEN_EXPIRES_MINUTES is missing', () => {
    expect(() =>
      loadEnv({
        ...buildBaseEnv(),
        PASSWORD_RESET_TOKEN_EXPIRES_MINUTES: undefined,
      })
    ).toThrow(/PASSWORD_RESET_TOKEN_EXPIRES_MINUTES/)
  })

  test('fails when S3_PUBLIC_BASE_URL is missing', () => {
    expect(() =>
      loadEnv({
        ...buildBaseEnv(),
        S3_PUBLIC_BASE_URL: undefined,
      })
    ).toThrow(/S3_PUBLIC_BASE_URL/)
  })

  test('fails when S3_PRESIGNED_URL_EXPIRES_SECONDS is above 3600', () => {
    expect(() =>
      loadEnv({
        ...buildBaseEnv(),
        S3_PRESIGNED_URL_EXPIRES_SECONDS: '7200',
      })
    ).toThrow(/S3_PRESIGNED_URL_EXPIRES_SECONDS/)
  })

  test('fails when MAX_MEDIA_UPLOAD_BYTES is missing', () => {
    expect(() =>
      loadEnv({
        ...buildBaseEnv(),
        MAX_MEDIA_UPLOAD_BYTES: undefined,
      })
    ).toThrow(/MAX_MEDIA_UPLOAD_BYTES/)
  })
})

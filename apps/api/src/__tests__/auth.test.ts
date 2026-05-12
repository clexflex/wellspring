import request from 'supertest'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { createApp } from '../app'
import { closeAdminPool } from '../db/admin'
import { closeRuntimePool } from '../db/pool'
import {
  cleanupAuthFixtures,
  createExpiredPasswordResetToken,
  createUsedPasswordResetToken,
  findPasswordResetTokenByCreator,
  resetDatabase,
  seedCreatorWithPassword,
} from '../db/test-helpers'

const app = createApp()
const creatorEmail = 'auth-creator@example.com'
const creatorPassword = 'StrongPass123!'
const creatorSlug = 'auth-creator'
const creatorDisplayName = 'Auth Creator'

afterAll(async () => {
  await closeRuntimePool()
  await closeAdminPool()
})

beforeEach(async () => {
  await resetDatabase()
  await cleanupAuthFixtures([creatorEmail, 'new-login@example.com'])
})

describe('auth endpoints', () => {
  test('signs up a creator', async () => {
    const response = await request(app).post('/api/auth/signup').send({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    expect(response.status).toBe(201)
    expect(response.body.creator.email).toBe(creatorEmail)
    expect(response.body.creator).not.toHaveProperty('password_hash')
    expect(response.body.token).toEqual(expect.any(String))
  })

  test('rejects duplicate signup email', async () => {
    await seedCreatorWithPassword({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    const response = await request(app).post('/api/auth/signup').send({
      email: creatorEmail,
      password: creatorPassword,
      displayName: 'Another Name',
      slug: 'another-slug',
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('CONFLICT')
  })

  test('rejects duplicate signup slug', async () => {
    await seedCreatorWithPassword({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    const response = await request(app).post('/api/auth/signup').send({
      email: 'other@example.com',
      password: creatorPassword,
      displayName: 'Other Creator',
      slug: creatorSlug,
    })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('CONFLICT')
  })

  test('logs in a creator', async () => {
    await seedCreatorWithPassword({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    const response = await request(app).post('/api/auth/login').send({
      email: creatorEmail,
      password: creatorPassword,
    })

    expect(response.status).toBe(200)
    expect(response.body.creator.email).toBe(creatorEmail)
    expect(response.body.creator).not.toHaveProperty('password_hash')
    expect(response.body.token).toEqual(expect.any(String))
  })

  test('rejects invalid login credentials', async () => {
    await seedCreatorWithPassword({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    const response = await request(app).post('/api/auth/login').send({
      email: creatorEmail,
      password: 'wrong-password',
    })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  test('returns current creator from /api/auth/me', async () => {
    const signupResponse = await request(app).post('/api/auth/signup').send({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    const response = await request(app)
      .get('/api/auth/me')
      .set('authorization', `Bearer ${signupResponse.body.token}`)

    expect(response.status).toBe(200)
    expect(response.body.creator.email).toBe(creatorEmail)
    expect(response.body.creator).not.toHaveProperty('password_hash')
  })

  test('rejects /api/auth/me without a token', async () => {
    const response = await request(app).get('/api/auth/me')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  test('creates password reset token in development/test mode', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    const response = await request(app).post('/api/auth/password-reset/request').send({
      email: creatorEmail,
    })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.debug.resetToken).toEqual(expect.any(String))
    expect(response.body.debug.resetUrl).toEqual(expect.any(String))

    const tokenRow = await findPasswordResetTokenByCreator(creator.id)
    expect(tokenRow?.token_hash).toBeTruthy()
  })

  test('confirms password reset and allows login with new password', async () => {
    await seedCreatorWithPassword({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    const requestResponse = await request(app).post('/api/auth/password-reset/request').send({
      email: creatorEmail,
    })

    const resetToken = requestResponse.body.debug.resetToken as string

    const confirmResponse = await request(app).post('/api/auth/password-reset/confirm').send({
      token: resetToken,
      newPassword: 'NewStrongPass123!',
    })

    expect(confirmResponse.status).toBe(200)
    expect(confirmResponse.body).toEqual({ success: true })

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: creatorEmail,
      password: 'NewStrongPass123!',
    })

    expect(loginResponse.status).toBe(200)
    expect(loginResponse.body.token).toEqual(expect.any(String))
  })

  test('rejects expired password reset token', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    const rawToken = await createExpiredPasswordResetToken(creator.id)

    const response = await request(app).post('/api/auth/password-reset/confirm').send({
      token: rawToken,
      newPassword: 'NewStrongPass123!',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_RESET_TOKEN')
  })

  test('rejects used password reset token', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorEmail,
      password: creatorPassword,
      displayName: creatorDisplayName,
      slug: creatorSlug,
    })

    const rawToken = await createUsedPasswordResetToken(creator.id)

    const response = await request(app).post('/api/auth/password-reset/confirm').send({
      token: rawToken,
      newPassword: 'NewStrongPass123!',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_RESET_TOKEN')
  })
})

import request from 'supertest'
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'

const createPresignedPutUrlMock = vi.hoisted(() => vi.fn())

vi.mock('../uploads/s3-client', () => ({
  createPresignedPutUrl: createPresignedPutUrlMock,
  resetS3ClientForTests: vi.fn(),
}))

import { createApp } from '../app'
import { AUDIT_ACTIONS } from '../audit/actions'
import { closeAdminPool } from '../db/admin'
import { closeRuntimePool } from '../db/pool'
import {
  cleanupAuthFixtures,
  findLatestAuditLogByCreator,
  resetDatabase,
  seedCreatorWithPassword,
} from '../db/test-helpers'

const app = createApp()
const creatorOneEmail = 'uploads-one@example.com'
const creatorTwoEmail = 'uploads-two@example.com'
const password = 'UploadsPass123!'

afterAll(async () => {
  await closeRuntimePool()
  await closeAdminPool()
})

beforeEach(async () => {
  await resetDatabase()
  await cleanupAuthFixtures([creatorOneEmail, creatorTwoEmail])
  createPresignedPutUrlMock.mockReset()
  createPresignedPutUrlMock.mockImplementation(async ({ key }: { key: string }) => {
    return `https://signed.example.com/${key}`
  })
})

async function login(email: string) {
  const response = await request(app).post('/api/auth/login').send({ email, password })
  expect(response.status).toBe(200)
  return response.body.token as string
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    filename: 'sleep-reset-intro.mp4',
    contentType: 'video/mp4',
    contentLength: 5_242_880,
    ...overrides,
  }
}

describe('upload routes', () => {
  test('rejects unauthenticated upload URL requests', async () => {
    const response = await request(app)
      .post('/api/uploads/session-media/presign')
      .send(validPayload())

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  test('malformed Bearer token returns 401, not 500', async () => {
    const response = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', 'Bearer undefined')
      .send(validPayload())

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  test('rejects unsupported content type', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Uploads One',
      slug: 'uploads-one',
    })
    const token = await login(creator.email)

    const response = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload({ contentType: 'image/png' }))

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('rejects contentLength over MAX_MEDIA_UPLOAD_BYTES', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Uploads One',
      slug: 'uploads-one',
    })
    const token = await login(creator.email)

    const response = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload({ contentLength: 524_288_001 }))

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.details.issues.fieldErrors.contentLength).toEqual(
      expect.arrayContaining(['contentLength must be less than or equal to 524288000'])
    )
  })

  test('rejects missing or invalid filename', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Uploads One',
      slug: 'uploads-one',
    })
    const token = await login(creator.email)

    const missingFilename = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload({ filename: '' }))

    expect(missingFilename.status).toBe(400)
    expect(missingFilename.body.error.code).toBe('VALIDATION_ERROR')

    const invalidFilename = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload({ filename: '../evil.mp4' }))

    expect(invalidFilename.status).toBe(400)
    expect(invalidFilename.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('returns tenant-scoped S3 key and upload fields', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Uploads One',
      slug: 'uploads-one',
    })
    const token = await login(creator.email)

    const response = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload())

    expect(response.status).toBe(200)
    expect(response.body.upload).toEqual(
      expect.objectContaining({
        uploadUrl: expect.any(String),
        key: expect.any(String),
        publicUrl: expect.any(String),
        expiresInSeconds: 300,
      })
    )
    expect(response.body.upload.key).toMatch(
      new RegExp(`^creators/${creator.id}/session-media/[0-9a-f-]{36}\\.mp4$`)
    )
    expect(response.body.upload.publicUrl).toContain(response.body.upload.key)
  })

  test('does not expose AWS credentials in response', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Uploads One',
      slug: 'uploads-one',
    })
    const token = await login(creator.email)

    const response = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload())

    expect(response.status).toBe(200)
    const bodyText = JSON.stringify(response.body).toLowerCase()
    expect(bodyText).not.toContain('aws_access_key_id')
    expect(bodyText).not.toContain('aws_secret_access_key')
    expect(bodyText).not.toContain('test-access-key-id')
    expect(bodyText).not.toContain('test-secret-access-key')
  })

  test('records UPLOAD_URL_CREATED audit log with safe metadata only', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Uploads One',
      slug: 'uploads-one',
    })
    const token = await login(creator.email)

    const response = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload())

    expect(response.status).toBe(200)

    const auditLog = await findLatestAuditLogByCreator(creator.id)
    expect(auditLog?.action).toBe(AUDIT_ACTIONS.UPLOAD_URL_CREATED)
    expect(auditLog?.target_type).toBe('UPLOAD')
    expect(auditLog?.metadata).toEqual(
      expect.objectContaining({
        key: response.body.upload.key,
        contentType: 'video/mp4',
        contentLength: 5_242_880,
        expiresInSeconds: 300,
        originalFilename: 'sleep-reset-intro.mp4',
      })
    )
    expect(auditLog?.metadata).not.toHaveProperty('uploadUrl')
  })

  test('same original filename produces different keys across requests', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Uploads One',
      slug: 'uploads-one',
    })
    const token = await login(creator.email)

    const first = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload())

    const second = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload())

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(first.body.upload.key).not.toBe(second.body.upload.key)
  })

  test('keys for different creators are tenant-scoped differently', async () => {
    const creatorOne = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Uploads One',
      slug: 'uploads-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Uploads Two',
      slug: 'uploads-two',
    })
    const tokenOne = await login(creatorOne.email)
    const tokenTwo = await login(creatorTwo.email)

    const responseOne = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${tokenOne}`)
      .send(validPayload({ filename: 'a.mp4' }))

    const responseTwo = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${tokenTwo}`)
      .send(validPayload({ filename: 'a.mp4' }))

    expect(responseOne.status).toBe(200)
    expect(responseTwo.status).toBe(200)
    expect(responseOne.body.upload.key).toContain(`creators/${creatorOne.id}/session-media/`)
    expect(responseTwo.body.upload.key).toContain(`creators/${creatorTwo.id}/session-media/`)
    expect(responseOne.body.upload.key).not.toBe(responseTwo.body.upload.key)
  })

  test('rejects filename extension mismatch with content type', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Uploads One',
      slug: 'uploads-one',
    })
    const token = await login(creator.email)

    const response = await request(app)
      .post('/api/uploads/session-media/presign')
      .set('authorization', `Bearer ${token}`)
      .send(validPayload({ filename: 'sleep-reset-intro.mp3', contentType: 'video/mp4' }))

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })
})

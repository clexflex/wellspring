import request from 'supertest'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { createApp } from '../app'
import { AUDIT_ACTIONS } from '../audit/actions'
import { closeAdminPool } from '../db/admin'
import { closeRuntimePool } from '../db/pool'
import {
  cleanupAuthFixtures,
  createProgramFixture,
  findLatestAuditLogByCreator,
  findProgramById,
  resetDatabase,
  seedCreatorWithPassword,
} from '../db/test-helpers'

const app = createApp()
const creatorOneEmail = 'programs-one@example.com'
const creatorTwoEmail = 'programs-two@example.com'
const password = 'ProgramsPass123!'

afterAll(async () => {
  await closeRuntimePool()
  await closeAdminPool()
})

beforeEach(async () => {
  await resetDatabase()
  await cleanupAuthFixtures([creatorOneEmail, creatorTwoEmail])
})

async function login(email: string) {
  const response = await request(app).post('/api/auth/login').send({ email, password })
  expect(response.status).toBe(200)
  return response.body.token as string
}

describe('program routes', () => {
  test('rejects unauthenticated program requests', async () => {
    const response = await request(app).get('/api/programs')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  test('verifies malformed Bearer tokens on program routes return 401, not 500', async () => {
    const response = await request(app).get('/api/programs').set('authorization', 'Bearer undefined')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  test('creates a program for the authenticated creator', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app).post('/api/programs').set('authorization', `Bearer ${token}`).send({
      title: '30-Day Sleep Reset',
      description: 'A structured program for improving sleep.',
    })

    expect(response.status).toBe(201)
    expect(response.body.program).toEqual(
      expect.objectContaining({
        title: '30-Day Sleep Reset',
        description: 'A structured program for improving sleep.',
      })
    )

    const program = await findProgramById(response.body.program.id)
    expect(program?.creator_id).toBe(creator.id)
  })

  test('rejects forged creator_id on program create', async () => {
    await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app).post('/api/programs').set('authorization', `Bearer ${token}`).send({
      creator_id: '22222222-2222-2222-2222-222222222222',
      title: 'Forged Program',
      description: 'Should fail.',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('lists only programs for the authenticated creator', async () => {
    const creatorOne = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Programs Two',
      slug: 'programs-two',
    })

    await createProgramFixture({ creatorId: creatorOne.id, title: 'Program A', description: 'A', updatedAt: '2026-05-13T00:03:00.000Z' })
    await createProgramFixture({ creatorId: creatorOne.id, title: 'Program B', description: 'B', updatedAt: '2026-05-13T00:02:00.000Z' })
    await createProgramFixture({ creatorId: creatorTwo.id, title: 'Other Program', description: 'C', updatedAt: '2026-05-13T00:01:00.000Z' })

    const token = await login(creatorOneEmail)
    const response = await request(app)
      .get('/api/programs?limit=1&offset=1')
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0].title).toBe('Program B')
    expect(response.body.pageInfo).toEqual({
      limit: 1,
      offset: 1,
      hasMore: false,
    })
  })

  test('gets a program owned by the authenticated creator', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Focus Program',
      description: 'Deep work for wellness creators.',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .get(`/api/programs/${program.id}`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.program.id).toBe(program.id)
    expect(response.body.program.title).toBe('Focus Program')
  })

  test('rejects cross-tenant program access', async () => {
    await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Programs Two',
      slug: 'programs-two',
    })
    const program = await createProgramFixture({
      creatorId: creatorTwo.id,
      title: 'Private Program',
      description: 'Other tenant',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .get(`/api/programs/${program.id}`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  test('updates a program owned by the authenticated creator', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Original Title',
      description: 'Original description',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .patch(`/api/programs/${program.id}`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Updated Title' })

    expect(response.status).toBe(200)
    expect(response.body.program.title).toBe('Updated Title')
    expect(response.body.program.description).toBe('Original description')
  })

  test('rejects cross-tenant program update', async () => {
    await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Programs Two',
      slug: 'programs-two',
    })
    const program = await createProgramFixture({
      creatorId: creatorTwo.id,
      title: 'Private Program',
      description: 'Do not touch',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .patch(`/api/programs/${program.id}`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Hacked Title' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  test('deletes a program owned by the authenticated creator', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Delete Me',
      description: 'Delete description',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .delete(`/api/programs/${program.id}`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(204)

    const deleted = await findProgramById(program.id)
    expect(deleted).toBeNull()
  })

  test('records audit log on program create', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app).post('/api/programs').set('authorization', `Bearer ${token}`).send({
      title: 'Audit Create',
      description: 'Track create.',
    })

    expect(response.status).toBe(201)

    const auditLog = await findLatestAuditLogByCreator(creator.id)
    expect(auditLog?.action).toBe(AUDIT_ACTIONS.PROGRAM_CREATED)
    expect(auditLog?.metadata).toEqual({ title: 'Audit Create' })
  })

  test('records audit log on program update', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Audit Update',
      description: 'Before',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .patch(`/api/programs/${program.id}`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Audit Updated', description: 'After' })

    expect(response.status).toBe(200)

    const auditLog = await findLatestAuditLogByCreator(creator.id)
    expect(auditLog?.action).toBe(AUDIT_ACTIONS.PROGRAM_UPDATED)
    expect(auditLog?.metadata).toEqual({ changedFields: ['title', 'description'] })
  })

  test('records audit log on program delete', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Programs One',
      slug: 'programs-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Audit Delete',
      description: 'Delete audit',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .delete(`/api/programs/${program.id}`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(204)

    const auditLog = await findLatestAuditLogByCreator(creator.id)
    expect(auditLog?.action).toBe(AUDIT_ACTIONS.PROGRAM_DELETED)
    expect(auditLog?.metadata).toEqual({ title: 'Audit Delete' })
  })
})

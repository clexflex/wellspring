import request from 'supertest'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { createApp } from '../app'
import { AUDIT_ACTIONS } from '../audit/actions'
import { closeAdminPool } from '../db/admin'
import { closeRuntimePool } from '../db/pool'
import {
  cleanupAuthFixtures,
  createProgramFixture,
  createSessionFixture,
  findLatestAuditLogByCreator,
  findSessionById,
  listSessionsByProgram,
  resetDatabase,
  seedCreatorWithPassword,
} from '../db/test-helpers'

const app = createApp()
const creatorOneEmail = 'sessions-one@example.com'
const creatorTwoEmail = 'sessions-two@example.com'
const password = 'SessionsPass123!'

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

describe('session routes', () => {
  test('rejects unauthenticated session requests', async () => {
    const response = await request(app).get('/api/programs/00000000-0000-0000-0000-000000000001/sessions')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  test('verifies malformed Bearer tokens on session routes return 401, not 500', async () => {
    const response = await request(app)
      .get('/api/sessions/00000000-0000-0000-0000-000000000001')
      .set('authorization', 'Bearer undefined')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  test('creates a session for a program owned by the authenticated creator', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Sleep Reset',
      description: 'Program for better sleep',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions`)
      .set('authorization', `Bearer ${token}`)
      .send({
        title: 'Intro to Sleep Reset',
        description: 'Welcome session',
        durationSeconds: 600,
        instructorName: 'Ava Bloom',
        tags: ['sleep', 'breathwork'],
        mediaUrl: 'https://example.com/media.mp4',
        mediaType: 'video',
      })

    expect(response.status).toBe(201)
    expect(response.body.session).toEqual(
      expect.objectContaining({
        programId: program.id,
        title: 'Intro to Sleep Reset',
        description: 'Welcome session',
        durationSeconds: 600,
        position: 1,
        instructorName: 'Ava Bloom',
        tags: ['sleep', 'breathwork'],
        mediaUrl: 'https://example.com/media.mp4',
        mediaType: 'video',
      })
    )

    const session = await findSessionById(response.body.session.id)
    expect(session?.creator_id).toBe(creator.id)
    expect(session?.position).toBe(1)
  })

  test('rejects forged creator_id on session create', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Sleep Reset',
      description: 'Program for better sleep',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions`)
      .set('authorization', `Bearer ${token}`)
      .send({
        creator_id: '22222222-2222-2222-2222-222222222222',
        title: 'Forged Session',
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('rejects creating a session under a cross-tenant program', async () => {
    await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Sessions Two',
      slug: 'sessions-two',
    })
    const program = await createProgramFixture({
      creatorId: creatorTwo.id,
      title: 'Other Program',
      description: 'Private',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Blocked Session' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  test('create without position appends to the end of the program', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'First', position: 1 })
    await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Second', position: 2 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Appended Session' })

    expect(response.status).toBe(201)
    expect(response.body.session.position).toBe(3)
  })

  test('lists only sessions for the authenticated creator and program', async () => {
    const creatorOne = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Sessions Two',
      slug: 'sessions-two',
    })
    const programOne = await createProgramFixture({ creatorId: creatorOne.id, title: 'Program One', description: 'One' })
    const programTwo = await createProgramFixture({ creatorId: creatorTwo.id, title: 'Program Two', description: 'Two' })

    await createSessionFixture({ creatorId: creatorOne.id, programId: programOne.id, title: 'Second', position: 2, createdAt: '2026-05-13T00:02:00.000Z' })
    await createSessionFixture({ creatorId: creatorOne.id, programId: programOne.id, title: 'First', position: 1, createdAt: '2026-05-13T00:01:00.000Z' })
    await createSessionFixture({ creatorId: creatorTwo.id, programId: programTwo.id, title: 'Other', position: 1, createdAt: '2026-05-13T00:03:00.000Z' })

    const token = await login(creatorOneEmail)
    const response = await request(app)
      .get(`/api/programs/${programOne.id}/sessions`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(2)
    expect(response.body.items.map((item: { title: string }) => item.title)).toEqual(['First', 'Second'])
  })

  test('gets a session owned by the authenticated creator', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const session = await createSessionFixture({
      creatorId: creator.id,
      programId: program.id,
      title: 'Focused Session',
      description: 'Detailed description',
      position: 1,
      durationSeconds: 720,
      instructorName: 'Ava Bloom',
      tags: ['focus'],
      mediaUrl: 'https://example.com/focus.mp4',
      mediaType: 'video',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .get(`/api/sessions/${session.id}`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.session).toEqual(
      expect.objectContaining({
        id: session.id,
        title: 'Focused Session',
        durationSeconds: 720,
      })
    )
  })

  test('rejects cross-tenant session access', async () => {
    await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Sessions Two',
      slug: 'sessions-two',
    })
    const program = await createProgramFixture({ creatorId: creatorTwo.id, title: 'Other Program', description: 'Private' })
    const session = await createSessionFixture({ creatorId: creatorTwo.id, programId: program.id, title: 'Private Session', position: 1 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .get(`/api/sessions/${session.id}`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  test('updates a session owned by the authenticated creator', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const session = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Original', position: 1 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .patch(`/api/sessions/${session.id}`)
      .set('authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Session',
        durationSeconds: 900,
        instructorName: 'Ava Bloom',
        tags: ['sleep'],
        mediaUrl: 'https://example.com/updated.mp4',
        mediaType: 'video',
      })

    expect(response.status).toBe(200)
    expect(response.body.session).toEqual(
      expect.objectContaining({
        title: 'Updated Session',
        durationSeconds: 900,
        instructorName: 'Ava Bloom',
      })
    )
  })

  test('rejects cross-tenant session update', async () => {
    await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Sessions Two',
      slug: 'sessions-two',
    })
    const program = await createProgramFixture({ creatorId: creatorTwo.id, title: 'Other Program', description: 'Private' })
    const session = await createSessionFixture({ creatorId: creatorTwo.id, programId: program.id, title: 'Private Session', position: 1 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .patch(`/api/sessions/${session.id}`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Hacked Session' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  test('deletes a session owned by the authenticated creator', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const first = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'First', position: 1 })
    const second = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Second', position: 2 })
    const third = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Third', position: 3 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .delete(`/api/sessions/${second.id}`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(204)
    expect(await findSessionById(second.id)).toBeNull()

    const remaining = await listSessionsByProgram(program.id)
    expect(remaining.map((item) => ({ id: item.id, position: item.position }))).toEqual([
      { id: first.id, position: 1 },
      { id: third.id, position: 2 },
    ])
  })

  test('rejects cross-tenant session delete', async () => {
    await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Sessions Two',
      slug: 'sessions-two',
    })
    const program = await createProgramFixture({ creatorId: creatorTwo.id, title: 'Other Program', description: 'Private' })
    const session = await createSessionFixture({ creatorId: creatorTwo.id, programId: program.id, title: 'Private Session', position: 1 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .delete(`/api/sessions/${session.id}`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  test('reorders sessions within a program', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const first = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'First', position: 1 })
    const second = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Second', position: 2 })
    const third = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Third', position: 3 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/reorder`)
      .set('authorization', `Bearer ${token}`)
      .send({ sessionIds: [third.id, first.id, second.id] })

    expect(response.status).toBe(200)
    expect(response.body.items.map((item: { id: string; position: number }) => ({ id: item.id, position: item.position }))).toEqual([
      { id: third.id, position: 1 },
      { id: first.id, position: 2 },
      { id: second.id, position: 3 },
    ])
  })

  test('rejects reorder with missing session ids', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const first = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'First', position: 1 })
    await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Second', position: 2 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/reorder`)
      .set('authorization', `Bearer ${token}`)
      .send({ sessionIds: [first.id] })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('rejects reorder with duplicate session ids', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const first = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'First', position: 1 })
    const second = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Second', position: 2 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/reorder`)
      .set('authorization', `Bearer ${token}`)
      .send({ sessionIds: [first.id, first.id, second.id] })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('rejects reorder with a session from another program', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const programOne = await createProgramFixture({ creatorId: creator.id, title: 'Program One', description: 'One' })
    const programTwo = await createProgramFixture({ creatorId: creator.id, title: 'Program Two', description: 'Two' })
    const first = await createSessionFixture({ creatorId: creator.id, programId: programOne.id, title: 'First', position: 1 })
    const second = await createSessionFixture({ creatorId: creator.id, programId: programOne.id, title: 'Second', position: 2 })
    const foreign = await createSessionFixture({ creatorId: creator.id, programId: programTwo.id, title: 'Foreign', position: 1 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${programOne.id}/sessions/reorder`)
      .set('authorization', `Bearer ${token}`)
      .send({ sessionIds: [first.id, foreign.id, second.id] })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('records audit log on session create', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Audit Create' })

    expect(response.status).toBe(201)

    const auditLog = await findLatestAuditLogByCreator(creator.id)
    expect(auditLog?.action).toBe(AUDIT_ACTIONS.SESSION_CREATED)
    expect(auditLog?.metadata).toEqual({ title: 'Audit Create', position: 1 })
  })

  test('records audit log on session update', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const session = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Audit Update', position: 1 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .patch(`/api/sessions/${session.id}`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Updated', mediaType: 'audio' })

    expect(response.status).toBe(200)

    const auditLog = await findLatestAuditLogByCreator(creator.id)
    expect(auditLog?.action).toBe(AUDIT_ACTIONS.SESSION_UPDATED)
    expect(auditLog?.metadata).toEqual({ changedFields: ['title', 'mediaType'] })
  })

  test('records audit log on session delete', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const session = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Audit Delete', position: 1 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .delete(`/api/sessions/${session.id}`)
      .set('authorization', `Bearer ${token}`)

    expect(response.status).toBe(204)

    const auditLog = await findLatestAuditLogByCreator(creator.id)
    expect(auditLog?.action).toBe(AUDIT_ACTIONS.SESSION_DELETED)
    expect(auditLog?.metadata).toEqual({ title: 'Audit Delete', position: 1 })
  })

  test('records audit log on session reorder', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const first = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'First', position: 1 })
    const second = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Second', position: 2 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/reorder`)
      .set('authorization', `Bearer ${token}`)
      .send({ sessionIds: [second.id, first.id] })

    expect(response.status).toBe(200)

    const auditLog = await findLatestAuditLogByCreator(creator.id)
    expect(auditLog?.action).toBe(AUDIT_ACTIONS.SESSIONS_REORDERED)
    expect(auditLog?.metadata).toEqual({ sessionIds: [second.id, first.id] })
  })

  test('create with explicit position shifts siblings', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Sessions One',
      slug: 'sessions-one',
    })
    const program = await createProgramFixture({ creatorId: creator.id, title: 'Program', description: 'Program' })
    const first = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'First', position: 1 })
    const second = await createSessionFixture({ creatorId: creator.id, programId: program.id, title: 'Second', position: 2 })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions`)
      .set('authorization', `Bearer ${token}`)
      .send({ title: 'Inserted', position: 2 })

    expect(response.status).toBe(201)

    const sessions = await listSessionsByProgram(program.id)
    expect(sessions.map((item) => ({ id: item.id, title: item.title, position: item.position }))).toEqual([
      { id: first.id, title: 'First', position: 1 },
      { id: response.body.session.id, title: 'Inserted', position: 2 },
      { id: second.id, title: 'Second', position: 3 },
    ])
  })
})

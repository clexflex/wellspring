import request from 'supertest'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { createApp } from '../app'
import { closeAdminPool } from '../db/admin'
import { closeRuntimePool } from '../db/pool'
import {
  cleanupAuthFixtures,
  createAuditLog,
  resetDatabase,
  seedCreatorWithPassword,
} from '../db/test-helpers'
import { recordAuditLog } from '../audit/record'
import { AUDIT_ACTIONS } from '../audit/actions'
import { withTenantContext } from '../db/tenant-context'

const app = createApp()
const creatorOneEmail = 'audit-one@example.com'
const creatorTwoEmail = 'audit-two@example.com'
const password = 'AuditPass123!'

afterAll(async () => {
  await closeRuntimePool()
  await closeAdminPool()
})

beforeEach(async () => {
  await resetDatabase()
  await cleanupAuthFixtures([creatorOneEmail, creatorTwoEmail])
})

describe('GET /api/audit-logs', () => {
  test('rejects /api/audit-logs without auth', async () => {
    const response = await request(app).get('/api/audit-logs')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
    expect(response.body.error.message).toBe('Authentication required')
  })

  test('rejects /api/audit-logs with an invalid bearer token', async () => {
    const response = await request(app)
      .get('/api/audit-logs')
      .set('authorization', 'Bearer undefined')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
    expect(response.body.error.message).toBe('Authentication required')
  })

  test('returns only audit logs for the authenticated creator', async () => {
    const creatorOne = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Audit One',
      slug: 'audit-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Audit Two',
      slug: 'audit-two',
    })

    await createAuditLog({
      creatorId: creatorOne.id,
      actorCreatorId: creatorOne.id,
      action: AUDIT_ACTIONS.CREATOR_SIGNED_UP,
      targetType: 'CREATOR',
      targetId: creatorOne.id,
      metadata: { source: 'test' },
      createdAt: '2026-05-13T00:00:00.000Z',
    })
    await createAuditLog({
      creatorId: creatorTwo.id,
      actorCreatorId: creatorTwo.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      targetType: 'CREATOR',
      targetId: creatorTwo.id,
      metadata: { source: 'other-tenant' },
      createdAt: '2026-05-13T00:01:00.000Z',
    })

    const login = await request(app).post('/api/auth/login').send({ email: creatorOneEmail, password })
    const response = await request(app)
      .get('/api/audit-logs')
      .set('authorization', `Bearer ${login.body.token}`)

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0].metadata).toEqual({ source: 'test' })
  })

  test('filters audit logs by action type', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Audit One',
      slug: 'audit-one',
    })

    await createAuditLog({
      creatorId: creator.id,
      actorCreatorId: creator.id,
      action: AUDIT_ACTIONS.CREATOR_SIGNED_UP,
      targetType: 'CREATOR',
      targetId: creator.id,
      metadata: { type: 'signup' },
      createdAt: '2026-05-13T00:00:00.000Z',
    })
    await createAuditLog({
      creatorId: creator.id,
      actorCreatorId: creator.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      targetType: 'CREATOR',
      targetId: creator.id,
      metadata: { type: 'reset' },
      createdAt: '2026-05-13T00:01:00.000Z',
    })

    const login = await request(app).post('/api/auth/login').send({ email: creatorOneEmail, password })
    const response = await request(app)
      .get(`/api/audit-logs?action=${AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED}`)
      .set('authorization', `Bearer ${login.body.token}`)

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0].action).toBe(AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED)
  })

  test('filters audit logs by date range', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Audit One',
      slug: 'audit-one',
    })

    await createAuditLog({
      creatorId: creator.id,
      actorCreatorId: creator.id,
      action: AUDIT_ACTIONS.CREATOR_SIGNED_UP,
      targetType: 'CREATOR',
      targetId: creator.id,
      metadata: { marker: 'old' },
      createdAt: '2026-05-10T00:00:00.000Z',
    })
    await createAuditLog({
      creatorId: creator.id,
      actorCreatorId: creator.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      targetType: 'CREATOR',
      targetId: creator.id,
      metadata: { marker: 'inside' },
      createdAt: '2026-05-12T00:00:00.000Z',
    })

    const login = await request(app).post('/api/auth/login').send({ email: creatorOneEmail, password })
    const response = await request(app)
      .get('/api/audit-logs?from=2026-05-11T00:00:00.000Z&to=2026-05-12T23:59:59.999Z')
      .set('authorization', `Bearer ${login.body.token}`)

    expect(response.status).toBe(200)
    expect(response.body.items).toHaveLength(1)
    expect(response.body.items[0].metadata).toEqual({ marker: 'inside' })
  })

  test('paginates audit logs predictably', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Audit One',
      slug: 'audit-one',
    })

    await createAuditLog({
      creatorId: creator.id,
      actorCreatorId: creator.id,
      action: AUDIT_ACTIONS.CREATOR_SIGNED_UP,
      targetType: 'CREATOR',
      targetId: creator.id,
      metadata: { page: 1 },
      createdAt: '2026-05-13T00:03:00.000Z',
    })
    await createAuditLog({
      creatorId: creator.id,
      actorCreatorId: creator.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      targetType: 'CREATOR',
      targetId: creator.id,
      metadata: { page: 2 },
      createdAt: '2026-05-13T00:02:00.000Z',
    })
    await createAuditLog({
      creatorId: creator.id,
      actorCreatorId: creator.id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_CONFIRMED,
      targetType: 'CREATOR',
      targetId: creator.id,
      metadata: { page: 3 },
      createdAt: '2026-05-13T00:01:00.000Z',
    })

    const login = await request(app).post('/api/auth/login').send({ email: creatorOneEmail, password })
    const firstPage = await request(app)
      .get('/api/audit-logs?limit=2')
      .set('authorization', `Bearer ${login.body.token}`)

    expect(firstPage.status).toBe(200)
    expect(firstPage.body.items).toHaveLength(2)
    expect(firstPage.body.pageInfo.hasMore).toBe(true)
    expect(firstPage.body.pageInfo.nextCursor).toEqual(expect.any(String))

    const secondPage = await request(app)
      .get(`/api/audit-logs?limit=2&cursor=${encodeURIComponent(firstPage.body.pageInfo.nextCursor)}`)
      .set('authorization', `Bearer ${login.body.token}`)

    expect(secondPage.status).toBe(200)
    expect(secondPage.body.items).toHaveLength(1)
    expect(secondPage.body.items[0].metadata).toEqual({ page: 3 })
  })

  test('recordAuditLog inserts an audit log under the active tenant context', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Audit One',
      slug: 'audit-one',
    })

    await withTenantContext(creator.id, async (client) => {
      await recordAuditLog(client, {
        actorCreatorId: creator.id,
        action: AUDIT_ACTIONS.CREATOR_SIGNED_UP,
        targetType: 'CREATOR',
        targetId: creator.id,
        metadata: { direct: true },
      })
    })

    const login = await request(app).post('/api/auth/login').send({ email: creatorOneEmail, password })
    const response = await request(app)
      .get('/api/audit-logs')
      .set('authorization', `Bearer ${login.body.token}`)

    expect(response.status).toBe(200)
    expect(response.body.items[0].metadata).toEqual({ direct: true })
  })
})

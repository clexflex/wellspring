import request from 'supertest'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'

import { createApp } from '../app'
import { AUDIT_ACTIONS } from '../audit/actions'
import { getAdminPool } from '../db/admin'
import { closeAdminPool } from '../db/admin'
import { closeRuntimePool } from '../db/pool'
import {
  cleanupAuthFixtures,
  createProgramFixture,
  createSessionFixture,
  findBulkImportByClientImportId,
  findLatestAuditLogByCreator,
  listBulkImportRowsByImportId,
  listSessionsByProgram,
  resetDatabase,
  seedCreatorWithPassword,
} from '../db/test-helpers'

const app = createApp()
const creatorOneEmail = 'imports-one@example.com'
const creatorTwoEmail = 'imports-two@example.com'
const password = 'ImportsPass123!'

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

function buildCsv(rows: string[]): string {
  return ['title,description,durationSeconds,instructorName,tags,mediaUrl,mediaType,position', ...rows].join('\n')
}

describe('session import routes', () => {
  test('rejects unauthenticated import requests', async () => {
    const response = await request(app)
      .post('/api/programs/00000000-0000-0000-0000-000000000001/sessions/import')
      .send({
        clientImportId: 'import-1',
        csv: buildCsv(['Session A,Desc,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1']),
      })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  test('malformed Bearer token returns 401, not 500', async () => {
    const response = await request(app)
      .post('/api/programs/00000000-0000-0000-0000-000000000001/sessions/import')
      .set('authorization', 'Bearer undefined')
      .send({
        clientImportId: 'import-1',
        csv: buildCsv(['Session A,Desc,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1']),
      })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  test('rejects invalid programId', async () => {
    await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post('/api/programs/not-a-uuid/sessions/import')
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId: 'import-1',
        csv: buildCsv(['Session A,Desc,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1']),
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('rejects import under a cross-tenant program', async () => {
    await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Imports Two',
      slug: 'imports-two',
    })
    const program = await createProgramFixture({
      creatorId: creatorTwo.id,
      title: 'Other Program',
      description: 'Private',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/import`)
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId: 'import-cross-tenant',
        csv: buildCsv(['Session A,Desc,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1']),
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('NOT_FOUND')
  })

  test('imports valid CSV rows into sessions', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Sleep Program',
      description: 'Program',
    })
    await createSessionFixture({
      creatorId: creator.id,
      programId: program.id,
      title: 'Existing Session',
      position: 1,
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/import`)
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId: 'valid-import',
        csv: buildCsv([
          'Session A,Desc A,300,Ava,sleep|intro,https://example.com/a.mp3,audio,100',
          'Session B,Desc B,450,Milo,focus|morning,https://example.com/b.mp4,video,200',
        ]),
      })

    expect(response.status).toBe(200)
    expect(response.body.import).toEqual(
      expect.objectContaining({
        clientImportId: 'valid-import',
        status: 'completed',
        insertedCount: 2,
        failedCount: 0,
        replayed: false,
      })
    )
    expect(response.body.rows).toHaveLength(2)
    expect(response.body.rows.every((row: { status: string }) => row.status === 'inserted')).toBe(true)

    const sessions = await listSessionsByProgram(program.id)
    expect(sessions.map((session) => ({ title: session.title, position: session.position }))).toEqual([
      { title: 'Existing Session', position: 1 },
      { title: 'Session A', position: 2 },
      { title: 'Session B', position: 3 },
    ])
  })

  test('returns row-level validation errors for invalid rows', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Sleep Program',
      description: 'Program',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/import`)
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId: 'mixed-import',
        csv: buildCsv([
          'Session A,Desc A,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1',
          'Bad Session,Desc B,0,,focus,not-a-url,audio,2',
        ]),
      })

    expect(response.status).toBe(200)
    expect(response.body.import.status).toBe('completed_with_errors')
    expect(response.body.import.insertedCount).toBe(1)
    expect(response.body.import.failedCount).toBe(1)
    expect(response.body.rows).toEqual([
      expect.objectContaining({
        rowNumber: 2,
        status: 'inserted',
        errors: [],
      }),
      expect.objectContaining({
        rowNumber: 3,
        status: 'failed',
      }),
    ])
    expect(response.body.rows[1].errors).toEqual(
      expect.arrayContaining([
        'durationSeconds must be a positive integer',
        'instructorName is required',
        'mediaUrl must be a valid URL',
      ])
    )
  })

  test('persists feedback for inserted and failed rows', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Sleep Program',
      description: 'Program',
    })
    const token = await login(creatorOneEmail)

    const clientImportId = 'persisted-feedback'
    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/import`)
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId,
        csv: buildCsv([
          'Session A,Desc A,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1',
          'Session B,Desc B,not-a-number,Milo,focus,https://example.com/b.mp4,video,2',
        ]),
      })

    expect(response.status).toBe(200)

    const importRow = await findBulkImportByClientImportId(creator.id, clientImportId)
    expect(importRow).not.toBeNull()
    const rowFeedback = await listBulkImportRowsByImportId(creator.id, importRow!.id)
    expect(rowFeedback.map((row) => row.status)).toEqual(['inserted', 'failed'])
    expect(rowFeedback[0]?.payload).toEqual(expect.objectContaining({ sessionId: expect.any(String) }))
    expect(rowFeedback[1]?.payload).toEqual(
      expect.objectContaining({
        errors: expect.arrayContaining(['durationSeconds must be a positive integer']),
      })
    )
  })

  test('records SESSIONS_IMPORTED audit log', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Sleep Program',
      description: 'Program',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/import`)
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId: 'audit-import',
        csv: buildCsv(['Session A,Desc A,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1']),
      })

    expect(response.status).toBe(200)

    const auditLog = await findLatestAuditLogByCreator(creator.id)
    expect(auditLog?.action).toBe(AUDIT_ACTIONS.SESSIONS_IMPORTED)
    expect(auditLog?.target_type).toBe('BULK_IMPORT')
    expect(auditLog?.metadata).toEqual(
      expect.objectContaining({
        clientImportId: 'audit-import',
        insertedCount: 1,
        failedCount: 0,
      })
    )
  })

  test('retry with same clientImportId does not duplicate sessions and returns previous persisted result', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Sleep Program',
      description: 'Program',
    })
    const token = await login(creatorOneEmail)
    const clientImportId = 'replay-import'

    const first = await request(app)
      .post(`/api/programs/${program.id}/sessions/import`)
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId,
        csv: buildCsv(['Session A,Desc A,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1']),
      })

    expect(first.status).toBe(200)
    expect(first.body.import.replayed).toBe(false)

    const second = await request(app)
      .post(`/api/programs/${program.id}/sessions/import`)
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId,
        csv: buildCsv([
          'Different Session,Should Not Be Used,500,Milo,focus|night,https://example.com/different.mp4,video,10',
        ]),
      })

    expect(second.status).toBe(200)
    expect(second.body.import.replayed).toBe(true)
    expect(second.body.import.insertedCount).toBe(1)
    expect(second.body.import.failedCount).toBe(0)
    expect(second.body.rows).toHaveLength(1)
    expect(second.body.rows[0].status).toBe('inserted')

    const sessions = await listSessionsByProgram(program.id)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]?.title).toBe('Session A')
  })

  test('same clientImportId can be used by different creators', async () => {
    const creatorOne = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const creatorTwo = await seedCreatorWithPassword({
      email: creatorTwoEmail,
      password,
      displayName: 'Imports Two',
      slug: 'imports-two',
    })
    const programOne = await createProgramFixture({
      creatorId: creatorOne.id,
      title: 'Program One',
      description: 'One',
    })
    const programTwo = await createProgramFixture({
      creatorId: creatorTwo.id,
      title: 'Program Two',
      description: 'Two',
    })
    const tokenOne = await login(creatorOneEmail)
    const tokenTwo = await login(creatorTwoEmail)
    const clientImportId = 'shared-import-id'

    const responseOne = await request(app)
      .post(`/api/programs/${programOne.id}/sessions/import`)
      .set('authorization', `Bearer ${tokenOne}`)
      .send({
        clientImportId,
        csv: buildCsv(['Session A,Desc A,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1']),
      })

    const responseTwo = await request(app)
      .post(`/api/programs/${programTwo.id}/sessions/import`)
      .set('authorization', `Bearer ${tokenTwo}`)
      .send({
        clientImportId,
        csv: buildCsv(['Session B,Desc B,450,Milo,focus|intro,https://example.com/b.mp4,video,1']),
      })

    expect(responseOne.status).toBe(200)
    expect(responseTwo.status).toBe(200)
    expect(responseOne.body.import.replayed).toBe(false)
    expect(responseTwo.body.import.replayed).toBe(false)
  })

  test('rejects CSV containing creator_id or program_id columns', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Sleep Program',
      description: 'Program',
    })
    const token = await login(creatorOneEmail)

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/import`)
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId: 'forged-columns',
        csv: [
          'title,durationSeconds,instructorName,creator_id',
          'Session A,300,Ava,22222222-2222-2222-2222-222222222222',
        ].join('\n'),
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  test('handles duplicate clientImportId conflict safely', async () => {
    const creator = await seedCreatorWithPassword({
      email: creatorOneEmail,
      password,
      displayName: 'Imports One',
      slug: 'imports-one',
    })
    const program = await createProgramFixture({
      creatorId: creator.id,
      title: 'Sleep Program',
      description: 'Program',
    })
    const token = await login(creatorOneEmail)
    const clientImportId = 'conflict-import'
    const adminPool = getAdminPool()

    const insertedImport = await adminPool.query<{ id: string }>(
      `
        insert into public.bulk_imports (creator_id, client_import_id, status, result_summary)
        values ($1, $2, 'completed', $3::jsonb)
        returning id
      `,
      [
        creator.id,
        clientImportId,
        JSON.stringify({
          insertedCount: 0,
          failedCount: 0,
          completedAt: new Date().toISOString(),
          status: 'completed',
        }),
      ]
    )

    const response = await request(app)
      .post(`/api/programs/${program.id}/sessions/import`)
      .set('authorization', `Bearer ${token}`)
      .send({
        clientImportId,
        csv: buildCsv(['Session A,Desc A,300,Ava,sleep|intro,https://example.com/a.mp3,audio,1']),
      })

    expect(response.status).toBe(200)
    expect(response.body.import.replayed).toBe(true)
    expect(response.body.import.id).toBe(insertedImport.rows[0].id)
    expect(response.body.import.insertedCount).toBe(0)
  })
})

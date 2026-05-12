import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { getAdminPool } from '../db/admin'
import { closeAdminPool } from '../db/admin'
import { closeRuntimePool } from '../db/pool'
import { runTenantQuery, withTenantContext } from '../db/tenant-context'
import { resetDatabase, seedIsolationFixtures } from '../db/test-helpers'

const creatorOneId = '11111111-1111-1111-1111-111111111111'
const creatorTwoId = '22222222-2222-2222-2222-222222222222'

beforeAll(async () => {
  await resetDatabase()
  await seedIsolationFixtures({ creatorOneId, creatorTwoId })
})

afterAll(async () => {
  await closeRuntimePool()
  await closeAdminPool()
})

describe('tenant isolation', () => {
  test('rejects cross-tenant program access', async () => {
    const result = await runTenantQuery(creatorOneId, (client) =>
      client.query('select id from public.programs where creator_id = $1', [creatorTwoId])
    )

    expect(result.rowCount).toBe(0)
  })

  test('rejects cross-tenant program update', async () => {
    const result = await runTenantQuery(creatorOneId, (client) =>
      client.query(
        'update public.programs set title = $1 where creator_id = $2 returning id',
        ['forbidden', creatorTwoId]
      )
    )

    expect(result.rowCount).toBe(0)
  })

  test('rejects forged creator_id on program create', async () => {
    await expect(
      runTenantQuery(creatorOneId, (client) =>
        client.query(
          'insert into public.programs (creator_id, title, description) values ($1, $2, $3)',
          [creatorTwoId, 'forged', 'forged']
        )
      )
    ).rejects.toThrow(/row-level security/i)
  })

  test('rejects cross-tenant session linkage', async () => {
    const adminPool = getAdminPool()
    const { rows } = await adminPool.query(
      'select id from public.programs where creator_id = $1 limit 1',
      [creatorTwoId]
    )

    await expect(
      runTenantQuery(creatorOneId, (client) =>
        client.query(
          'insert into public.sessions (creator_id, program_id, title, position) values ($1, $2, $3, $4)',
          [creatorOneId, rows[0].id, 'bad link', 999]
        )
      )
    ).rejects.toThrow()
  })

  test('withTenantContext returns only active-tenant rows', async () => {
    const rows = await withTenantContext(creatorOneId, async (client) => {
      const result = await client.query('select creator_id from public.programs order by title asc')
      return result.rows
    })

    expect(rows.length).toBeGreaterThan(0)
    expect(new Set(rows.map((row) => row.creator_id))).toEqual(new Set([creatorOneId]))
  })
})

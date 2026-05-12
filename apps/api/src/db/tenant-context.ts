import type { PoolClient, QueryResult, QueryResultRow } from 'pg'

import { getRuntimePool } from './pool'

export async function withTenantContext<T>(
  creatorId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getRuntimePool().connect()

  try {
    await client.query('begin')
    await client.query('select set_config($1, $2, true)', ['app.current_creator_id', creatorId])

    const result = await callback(client)

    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function runTenantQuery<R extends QueryResultRow = QueryResultRow>(
  creatorId: string,
  callback: (client: PoolClient) => Promise<QueryResult<R>>
): Promise<QueryResult<R>> {
  return withTenantContext(creatorId, callback)
}

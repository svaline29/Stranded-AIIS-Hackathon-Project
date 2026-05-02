import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

function createDb() {
  const client = createClient({
    url: `file:${process.cwd()}/stranded.db`,
  })

  return drizzle(client, { schema })
}

type DbClient = ReturnType<typeof createDb>

let _db: DbClient | null = null

export function getDb(): DbClient {
  if (!_db) {
    _db = createDb()
  }
  return _db
}

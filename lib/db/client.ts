import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
import path from 'path'

function createDb() {
  const isProduction = !!process.env.TURSO_DATABASE_URL

  const client = isProduction
    ? createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      })
    : createClient({
        url: `file:${path.join(process.cwd(), 'stranded.db')}`,
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

import path from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

function createDb() {
  const dbPath = path.join(process.cwd(), 'stranded.db')
  const sqlite = new Database(dbPath, {
    readonly: process.env.NODE_ENV === 'production',
    fileMustExist: true,
  })

  return drizzle(sqlite, { schema })
}

type DbClient = ReturnType<typeof createDb>

let _db: DbClient | null = null

export function getDb(): DbClient {
  if (!_db) {
    _db = createDb()
  }
  return _db
}

// Keep default export for backward compatibility
//export default getDb()

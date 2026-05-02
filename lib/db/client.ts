import path from 'path'
import Database, { Database as DatabaseType } from 'better-sqlite3'

let _db: DatabaseType | null = null

export function getDb(): DatabaseType {
  if (!_db) {
    const dbPath = path.join(process.cwd(), 'stranded.db')
    _db = new Database(dbPath, {
      readonly: process.env.NODE_ENV === 'production',
      fileMustExist: true,
    })
  }
  return _db
}

// Keep default export for backward compatibility
export default getDb()

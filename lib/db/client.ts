import path from 'path'
import Database from 'better-sqlite3'

const dbPath = path.join(process.cwd(), 'stranded.db')

const db = new Database(dbPath, {
  readonly: process.env.NODE_ENV === 'production',
  fileMustExist: true
})

export default db

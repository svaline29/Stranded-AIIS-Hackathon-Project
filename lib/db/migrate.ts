import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import path from 'path'

async function main() {
  const client = createClient({
    url: `file:${path.join(process.cwd(), 'stranded.db')}`,
  })
  const db = drizzle(client)
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations applied successfully.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

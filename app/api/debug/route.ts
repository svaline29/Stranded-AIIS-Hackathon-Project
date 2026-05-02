import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const cwd = process.cwd()
  const dbPath = path.join(cwd, 'stranded.db')
  const exists = fs.existsSync(dbPath)
  const files = fs.readdirSync(cwd)
  
  return NextResponse.json({
    cwd,
    dbPath,
    exists,
    filesInRoot: files
  })
}

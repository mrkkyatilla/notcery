#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(__dirname, '../src/shared/api/schema.d.ts')
const before = fs.readFileSync(schemaPath, 'utf8')

execSync('npm run api:types', {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
})

const after = fs.readFileSync(schemaPath, 'utf8')
if (before !== after) {
  console.error('[api:types] schema.d.ts is out of date — run npm run api:types and commit')
  process.exit(1)
}

console.log('[api:types] OK — OpenAPI types match committed file')

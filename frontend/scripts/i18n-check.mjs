#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.resolve(__dirname, '../locales')
const locales = ['tr', 'en']

function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

function loadLocale(locale, file) {
  const filePath = path.join(localesDir, locale, `${file}.json`)
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

const namespaceFiles = fs
  .readdirSync(path.join(localesDir, 'tr'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))

let failed = false

for (const ns of namespaceFiles) {
  const byLocale = Object.fromEntries(
    locales.map((locale) => [locale, new Set(flattenKeys(loadLocale(locale, ns)))]),
  )

  for (const locale of locales) {
    for (const other of locales) {
      if (locale === other) continue
      const missing = [...byLocale[other]].filter((k) => !byLocale[locale].has(k))
      const extra = [...byLocale[locale]].filter((k) => !byLocale[other].has(k))
      if (missing.length) {
        failed = true
        console.error(`[i18n] ${ns}: ${locale} missing keys (present in ${other}):`)
        missing.forEach((k) => console.error(`  - ${k}`))
      }
      if (extra.length) {
        failed = true
        console.error(`[i18n] ${ns}: ${locale} extra keys (not in ${other}):`)
        extra.forEach((k) => console.error(`  - ${k}`))
      }
    }
  }
}

if (failed) {
  process.exit(1)
}

console.log(`[i18n] OK — ${namespaceFiles.length} namespaces, locales: ${locales.join(', ')}`)

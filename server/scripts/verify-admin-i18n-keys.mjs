/**
 * Audit Admin translation key parity (en/fr/es) for new product keys.
 * Usage: node scripts/verify-admin-i18n-keys.mjs
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientI18n = path.resolve(__dirname, '../../client/src/i18n/adminTranslations.js')

const mod = await import(pathToFileURL(clientI18n).href)
const { adminEn, adminFr, adminEs } = mod

const flatten = (obj, prefix = '') => {
  const out = []
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, key))
    else out.push(key)
  }
  return out
}

const enKeys = new Set(flatten(adminEn))
const frKeys = new Set(flatten(adminFr))
const esKeys = new Set(flatten(adminEs))

const required = [
  'menu.employees',
  'menu.groups.management',
  'employees.title',
  'partners.discountSection',
  'extend.title',
  'extend.confirmExtension',
  'quick.newEmployee',
  'common.addNew',
  'accounting.partnerDiscountApplied',
  'bookings.partnerDiscount',
]

for (const k of required) {
  assert.ok(enKeys.has(k), `EN missing ${k}`)
  assert.ok(frKeys.has(k), `FR missing ${k}`)
  assert.ok(esKeys.has(k), `ES missing ${k}`)
}

const missingFr = [...enKeys].filter((k) => !frKeys.has(k))
const missingEs = [...enKeys].filter((k) => !esKeys.has(k))
console.log(`EN keys: ${enKeys.size}; FR missing vs EN: ${missingFr.length}; ES missing vs EN: ${missingEs.length}`)
if (missingFr.length) console.log('Sample FR missing:', missingFr.slice(0, 15).join(', '))
if (missingEs.length) console.log('Sample ES missing:', missingEs.slice(0, 15).join(', '))

assert.ok(missingFr.length < 50, 'Too many FR gaps vs EN')
assert.ok(missingEs.length < 50, 'Too many ES gaps vs EN')

console.log('OK: admin i18n key checks passed')

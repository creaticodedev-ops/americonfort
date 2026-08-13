/**
 * Audit Admin translation key parity (en/fr/es/ar).
 * Usage: node scripts/verify-admin-i18n-keys.mjs
 */
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientI18n = path.resolve(__dirname, '../../client/src/i18n/adminTranslations.js')
const clientAr = path.resolve(__dirname, '../../client/src/i18n/adminAr.generated.js')

const mod = await import(pathToFileURL(clientI18n).href)
const arMod = await import(pathToFileURL(clientAr).href)
const { adminEn, adminFr, adminEs } = mod
const { adminAr } = arMod

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
const arKeys = new Set(flatten(adminAr))

const required = [
  'menu.employees',
  'menu.groups.management',
  'employees.title',
  'chauffeurs.title',
  'samsars.title',
  'partners.discountSection',
  'extend.title',
  'extend.confirmExtension',
  'quick.newEmployee',
  'common.addNew',
  'accounting.partnerDiscountApplied',
  'accounting.grossRevenue',
  'bookings.partnerDiscount',
]

for (const k of required) {
  assert.ok(enKeys.has(k), `EN missing ${k}`)
  assert.ok(frKeys.has(k), `FR missing ${k}`)
  assert.ok(esKeys.has(k), `ES missing ${k}`)
  assert.ok(arKeys.has(k), `AR missing ${k}`)
}

const missingFr = [...enKeys].filter((k) => !frKeys.has(k))
const missingEs = [...enKeys].filter((k) => !esKeys.has(k))
const missingAr = [...enKeys].filter((k) => !arKeys.has(k))
console.log(
  `EN keys: ${enKeys.size}; FR missing: ${missingFr.length}; ES missing: ${missingEs.length}; AR missing: ${missingAr.length}`,
)
if (missingAr.length) console.log('Sample AR missing:', missingAr.slice(0, 20).join(', '))

assert.ok(missingFr.length < 80, 'Too many FR gaps vs EN')
assert.ok(missingEs.length < 80, 'Too many ES gaps vs EN')
assert.ok(missingAr.length < 120, 'Too many AR gaps vs EN')
assert.ok(adminAr.menu?.dashboard, 'AR menu.dashboard present')
assert.notEqual(adminAr.menu.dashboard, 'Dashboard', 'AR dashboard translated')

console.log('OK: admin i18n key checks passed (en/fr/es/ar)')

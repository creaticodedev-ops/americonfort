/**
 * Audit Admin translation key parity (en/fr/es/ar) including extras overlays.
 * Usage: node scripts/verify-admin-i18n-keys.mjs
 */
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientI18n = path.resolve(__dirname, '../../client/src/i18n/adminTranslations.js')
const clientAr = path.resolve(__dirname, '../../client/src/i18n/adminAr.generated.js')
const extrasPath = path.resolve(__dirname, '../../client/src/i18n/adminExtras.js')

const mod = await import(pathToFileURL(clientI18n).href)
const arMod = await import(pathToFileURL(clientAr).href)
const extras = await import(pathToFileURL(extrasPath).href)
const { adminEn, adminFr, adminEs } = mod
const { adminAr } = arMod

const deepMerge = (base, overlay) => {
  if (!overlay) return base
  const out = { ...(base || {}) }
  for (const [key, value] of Object.entries(overlay)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object') {
      out[key] = deepMerge(out[key], value)
    } else {
      out[key] = value
    }
  }
  return out
}

const flatten = (obj, prefix = '') => {
  const out = []
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, key))
    else out.push(key)
  }
  return out
}

const mergedEn = deepMerge(adminEn, extras.extrasEn)
const mergedFr = deepMerge(adminFr, extras.extrasFr)
const mergedEs = deepMerge(adminEs, extras.extrasEs)
const mergedAr = deepMerge(deepMerge(adminAr, extras.extrasAr), extras.polishArAdmin)

const enKeys = new Set(flatten(mergedEn))
const frKeys = new Set(flatten(mergedFr))
const esKeys = new Set(flatten(mergedEs))
const arKeys = new Set(flatten(mergedAr))

const extrasEnKeys = flatten(extras.extrasEn)
const extrasFrKeys = new Set(flatten(extras.extrasFr))
const extrasEsKeys = new Set(flatten(extras.extrasEs))
const extrasArKeys = new Set(flatten(extras.extrasAr))
const extrasMissingFr = extrasEnKeys.filter((k) => !extrasFrKeys.has(k))
const extrasMissingEs = extrasEnKeys.filter((k) => !extrasEsKeys.has(k))
const extrasMissingAr = extrasEnKeys.filter((k) => !extrasArKeys.has(k))

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
  'signatures.title',
  'ops.revenue',
  'lists.revenuesTitle',
  'details.customer',
  'carForm.automatic',
  'invoiceUi.cash',
  'commonUi.toggleSidebar',
]

for (const k of required) {
  assert.ok(enKeys.has(k), `EN missing ${k}`)
  assert.ok(frKeys.has(k), `FR missing ${k}`)
  assert.ok(esKeys.has(k), `ES missing ${k}`)
  assert.ok(arKeys.has(k), `AR missing ${k}`)
}

assert.equal(extrasMissingFr.length, 0, `extras FR missing: ${extrasMissingFr.slice(0, 20).join(', ')}`)
assert.equal(extrasMissingEs.length, 0, `extras ES missing: ${extrasMissingEs.slice(0, 20).join(', ')}`)
assert.equal(extrasMissingAr.length, 0, `extras AR missing: ${extrasMissingAr.slice(0, 20).join(', ')}`)

const missingFr = [...enKeys].filter((k) => !frKeys.has(k))
const missingEs = [...enKeys].filter((k) => !esKeys.has(k))
const missingAr = [...enKeys].filter((k) => !arKeys.has(k))
console.log(
  `EN keys: ${enKeys.size}; FR missing: ${missingFr.length}; ES missing: ${missingEs.length}; AR missing: ${missingAr.length}`,
)
console.log(
  `extras EN keys: ${extrasEnKeys.length}; FR/ES/AR extras gaps: ${extrasMissingFr.length}/${extrasMissingEs.length}/${extrasMissingAr.length}`,
)
if (missingAr.length) console.log('Sample AR missing:', missingAr.slice(0, 20).join(', '))
if (missingFr.length) console.log('Sample FR missing:', missingFr.slice(0, 20).join(', '))

assert.ok(missingFr.length < 80, 'Too many FR gaps vs EN')
assert.ok(missingEs.length < 80, 'Too many ES gaps vs EN')
assert.ok(missingAr.length < 120, 'Too many AR gaps vs EN')
assert.ok(mergedAr.menu?.dashboard, 'AR menu.dashboard present')
assert.notEqual(mergedAr.menu.dashboard, 'Dashboard', 'AR dashboard translated')
assert.equal(mergedAr.menu.samsars, 'السماسرة')

console.log('OK: admin i18n key checks passed (en/fr/es/ar + extras)')

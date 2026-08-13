/**
 * Verify Owner/Admin navigation IA vs menu links vs App.jsx routes.
 * Usage: node scripts/verify-admin-nav.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientSrc = path.resolve(__dirname, '../../client/src')

const navSrc = fs.readFileSync(path.join(clientSrc, 'components/owner/ownerNavConfig.js'), 'utf8')
const assetsSrc = fs.readFileSync(path.join(clientSrc, 'assets/ownerAssets.js'), 'utf8')
const appSrc = fs.readFileSync(path.join(clientSrc, 'App.jsx'), 'utf8')

const groupsBlock = navSrc.slice(
  navSrc.indexOf('export const OWNER_NAV_GROUPS'),
  navSrc.indexOf('const linkByPath'),
)
const groupIds = [...groupsBlock.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1])
assert.deepEqual(
  groupIds,
  ['main', 'operations', 'partners', 'finance', 'documents', 'insights', 'management', 'settings'],
  `Unexpected nav groups: ${groupIds.join(', ')}`,
)

const navPaths = [...groupsBlock.matchAll(/'\/owner[^']*'/g)].map((m) => m[0].slice(1, -1))
const uniqueNavPaths = [...new Set(navPaths)]

const menuPaths = [...assetsSrc.matchAll(/path:\s*'(\/owner[^']*)'/g)].map((m) => m[1])
const menuSet = new Set(menuPaths)

for (const p of uniqueNavPaths) {
  if (p.includes('edit-car')) continue
  assert.ok(menuSet.has(p), `Nav path missing from ownerMenuLinks: ${p}`)
}

assert.ok(!uniqueNavPaths.includes('/owner/add-car'), 'Add Car must stay a quick action, not a sidebar item')
assert.ok(uniqueNavPaths.includes('/owner/staff'), 'Staff missing from sidebar')
assert.ok(uniqueNavPaths.includes('/owner/settings/branding'), 'Branding missing from sidebar')
assert.ok(uniqueNavPaths.includes('/owner/settings/domains'), 'Domains missing from sidebar')
assert.ok(uniqueNavPaths.includes('/owner/signature-requests'), 'Signature requests missing from sidebar')
assert.ok(uniqueNavPaths.includes('/owner/vehicle-stats'), 'Statistics missing from sidebar')
assert.ok(uniqueNavPaths.includes('/owner/walk-in'), 'Walk-in missing from sidebar')

assert.ok(navSrc.includes("OWNER_NAV_STORAGE_KEY = 'americonfort.owner.navGroups.v5'"), 'Nav storage key should be v5')

assert.ok(appSrc.includes("path=\"staff\""), 'App.jsx missing /owner/staff route')
assert.ok(appSrc.includes("path=\"settings/*\""), 'App.jsx missing settings splat')
assert.ok(appSrc.includes("path=\"signature-requests\""), 'App.jsx missing signature-requests')
assert.ok(appSrc.includes("path=\"employees\""), 'App.jsx missing employees')
assert.ok(appSrc.includes("path=\"accounting/revenues\""), 'App.jsx missing revenues')

const requiredAppRoutes = [
  'analytics',
  'add-car',
  'manage-cars',
  'vehicle-stats',
  'manage-bookings',
  'walk-in',
  'customers',
  'locations',
  'calendar',
  'maintenance',
  'chauffeurs',
  'samsars',
  'partner-companies',
  'reports',
  'contracts',
  'invoices',
  'templates',
  'accounting',
  'audit',
]

for (const r of requiredAppRoutes) {
  assert.ok(appSrc.includes(`path="${r}`), `App.jsx missing route ${r}`)
}

const settingsSrc = fs.readFileSync(path.join(clientSrc, 'pages/owner/Settings.jsx'), 'utf8')
assert.ok(settingsSrc.includes('GeneralSettings'), 'Settings missing General page')
assert.ok(settingsSrc.includes('BrandingSettings'), 'Settings missing Branding page')
assert.ok(settingsSrc.includes('DomainSettings'), 'Settings missing Domains page')
assert.ok(settingsSrc.includes('path="permissions"'), 'Settings missing permissions redirect')

console.log(`OK: admin nav IA (${groupIds.length} groups, ${uniqueNavPaths.length} sidebar paths, ${menuPaths.length} menu links)`)

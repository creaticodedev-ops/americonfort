/**
 * Static verification: new Admin modules are wired in nav + App routes.
 * Run: node scripts/verify-owner-nav-modules.mjs (from client/)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

const expectedPaths = [
  '/owner/signature-requests',
  '/owner/chauffeurs',
  '/owner/samsars',
  '/owner/partner-companies',
  '/owner/accounting',
  '/owner/accounting/revenues',
  '/owner/accounting/samsar-payments',
  '/owner/accounting/agency-expenses',
  '/owner/accounting/vehicle-expenses',
]

const assets = read('src/assets/ownerAssets.js')
const nav = read('src/components/owner/ownerNavConfig.js')
const app = read('src/App.jsx')
const perms = read('src/utils/ownerPermissions.js')

let failed = 0
const ok = (label, pass) => {
  console.log(`${pass ? '✓' : '✗'} ${label}`)
  if (!pass) failed += 1
}

for (const p of expectedPaths) {
  ok(`ownerMenuLinks has ${p}`, assets.includes(`path: '${p}'`))
  ok(`OWNER_NAV_GROUPS includes ${p}`, nav.includes(`'${p}'`))
}

const routeSnippets = [
  'path="signature-requests"',
  'path="chauffeurs"',
  'path="samsars"',
  'path="partner-companies"',
  'path="accounting"',
  'path="accounting/revenues"',
  'path="accounting/samsar-payments"',
  'path="accounting/agency-expenses"',
  'path="accounting/vehicle-expenses"',
]
for (const s of routeSnippets) {
  ok(`App.jsx route ${s}`, app.includes(s))
}

for (const perm of [
  'accounting',
  'chauffeurs',
  'partners',
  'signature_requests',
  'contract_extensions',
]) {
  ok(`client OWNER_PERMISSIONS includes ${perm}`, perms.includes(`'${perm}'`))
}

ok('partners nav group exists', nav.includes("id: 'partners'"))
ok('accounting nav group exists', nav.includes("id: 'accounting'"))
ok('nav storage key bumped', nav.includes('navGroups.v2'))

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll owner nav/module wiring checks passed.')

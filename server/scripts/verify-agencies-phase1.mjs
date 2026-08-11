/**
 * Phase 1 Agencies — unit checks (no DB) + optional live API checks if env is set.
 *
 *   node scripts/verify-agencies-phase1.mjs
 *   SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... API_URL=http://localhost:3000 node scripts/verify-agencies-phase1.mjs
 */
import {
  AGENCY_STATUSES,
  agencyStatusQuery,
  resolveAgencyStatus,
  serializeAgency,
  getAgencyProfile,
  isOwnerPubliclyBookable,
  deriveAgencyHealth,
} from '../services/agencyService.js';
import { buildPublicVisibleCarFilter } from '../utils/carCatalog.js';

let failed = 0
const assert = (cond, label) => {
  if (cond) console.log(`OK  ${label}`)
  else {
    console.error(`FAIL ${label}`)
    failed += 1
  }
}

assert(AGENCY_STATUSES.includes('active'), 'status catalog includes active')
assert(AGENCY_STATUSES.includes('suspended'), 'status catalog includes suspended')
assert(AGENCY_STATUSES.includes('trial'), 'status catalog includes trial')
assert(AGENCY_STATUSES.includes('pending'), 'status catalog includes pending')

assert(resolveAgencyStatus({ accountStatus: 'pending', licenseStatus: 'trial' }) === 'pending', 'pending wins')
assert(resolveAgencyStatus({ accountStatus: 'suspended', licenseStatus: 'active' }) === 'suspended', 'suspended wins')
assert(resolveAgencyStatus({ accountStatus: 'disabled', licenseStatus: 'active' }) === 'suspended', 'disabled → suspended')
assert(resolveAgencyStatus({ accountStatus: 'active', licenseStatus: 'expired' }) === 'suspended', 'expired license → suspended')
assert(resolveAgencyStatus({ accountStatus: 'active', licenseStatus: 'trial' }) === 'trial', 'trial')
assert(resolveAgencyStatus({ accountStatus: 'active', licenseStatus: 'active' }) === 'active', 'active')

assert(agencyStatusQuery('pending').accountStatus === 'pending', 'pending query')
assert(Array.isArray(agencyStatusQuery('suspended').$or), 'suspended query uses $or')
assert(agencyStatusQuery('trial').licenseStatus === 'trial', 'trial query')
assert(agencyStatusQuery('active').licenseStatus === 'active', 'active query')

const serialized = serializeAgency({
  _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Contact',
  email: 'a@test.com',
  agencyName: 'Agency A',
  accountStatus: 'active',
  licenseStatus: 'trial',
  trialEndsAt: new Date(Date.now() + 86400000),
  agencyProfile: { city: 'Casablanca', country: 'Morocco', whatsapp: '212600000000' },
  createdAt: new Date(),
}, { vehicles: 3, reservations: 5, users: 1 })

assert(serialized.status === 'trial', 'serialize status')
assert(serialized.name === 'Agency A', 'serialize name')
assert(serialized.profile.city === 'Casablanca', 'serialize profile city')
assert(serialized.stats.vehicles === 3, 'serialize stats')
assert(getAgencyProfile({}).country === 'Morocco', 'default country')

assert(
  isOwnerPubliclyBookable({
    role: 'owner',
    accountStatus: 'active',
    licenseStatus: 'active',
  }) === true,
  'active licensed owner is bookable',
)
assert(
  isOwnerPubliclyBookable({
    role: 'owner',
    accountStatus: 'suspended',
    licenseStatus: 'active',
  }) === false,
  'suspended owner is not bookable publicly',
)
assert(
  isOwnerPubliclyBookable({
    role: 'owner',
    accountStatus: 'pending',
    licenseStatus: 'trial',
    trialEndsAt: new Date(Date.now() + 86400000),
  }) === false,
  'pending owner is not bookable publicly',
)
assert(
  isOwnerPubliclyBookable({
    role: 'owner',
    accountStatus: 'active',
    licenseStatus: 'expired',
  }) === false,
  'expired license owner is not bookable publicly',
)
assert(typeof buildPublicVisibleCarFilter === 'function', 'public car filter builder exported')

const healthPending = deriveAgencyHealth(
  { accountStatus: 'pending', licenseStatus: 'trial', role: 'owner', trialEndsAt: new Date(Date.now() + 86400000) },
  { fleetCount: 2, bookableVehicles: 1 },
)
assert(healthPending.issues.some((i) => i.code === 'pending_account'), 'health flags pending account')

const healthSuspended = deriveAgencyHealth(
  { accountStatus: 'suspended', licenseStatus: 'active', role: 'owner' },
  { fleetCount: 1, bookableVehicles: 1 },
)
assert(healthSuspended.issues.some((i) => i.code === 'suspended_account'), 'health flags suspended account')

const healthExpired = deriveAgencyHealth(
  { accountStatus: 'active', licenseStatus: 'expired', role: 'owner' },
  { fleetCount: 1, bookableVehicles: 1 },
)
assert(healthExpired.issues.some((i) => i.code === 'expired_license'), 'health flags expired license')

const healthEmptyFleet = deriveAgencyHealth(
  { accountStatus: 'active', licenseStatus: 'active', role: 'owner' },
  { fleetCount: 0, bookableVehicles: 0 },
)
assert(healthEmptyFleet.issues.some((i) => i.code === 'no_vehicles'), 'health flags empty fleet')

const healthNoBookable = deriveAgencyHealth(
  { accountStatus: 'active', licenseStatus: 'active', role: 'owner' },
  { fleetCount: 3, bookableVehicles: 0 },
)
assert(healthNoBookable.issues.some((i) => i.code === 'no_bookable_vehicles'), 'health flags no bookable vehicles')

const healthOk = deriveAgencyHealth(
  { accountStatus: 'active', licenseStatus: 'active', role: 'owner' },
  { fleetCount: 2, bookableVehicles: 2 },
)
assert(healthOk.ok === true && healthOk.issueCount === 0, 'healthy agency has no issues')

const detailedSerialized = serializeAgency(
  {
    _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    name: 'Contact',
    email: 'b@test.com',
    agencyName: 'Agency B',
    accountStatus: 'active',
    licenseStatus: 'active',
    role: 'owner',
    createdAt: new Date(),
  },
  {
    fleetCount: 4,
    bookableVehicles: 2,
    reservationsTotal: 10,
    reservationsPending: 1,
    reservationsActive: 2,
    reservationsCompleted: 5,
    staffCount: 1,
    vehicles: 4,
    reservations: 10,
    users: 1,
  },
)
assert(detailedSerialized.stats.bookableVehicles === 2, 'serialize detailed bookable vehicles')
assert(detailedSerialized.health.ok === true, 'serialize includes healthy status')

const apiUrl = (process.env.API_URL || process.env.VITE_BASE_URL || '').replace(/\/$/, '')
const email = process.env.SUPERADMIN_EMAIL
const password = process.env.SUPERADMIN_PASSWORD

if (apiUrl && email && password) {
  console.log('\n— Live API checks —')
  try {
    const loginRes = await fetch(`${apiUrl}/api/super-admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const login = await loginRes.json()
    assert(login.success && login.token, 'super admin login')

    const listRes = await fetch(`${apiUrl}/api/super-admin/agencies?limit=5`, {
      headers: { Authorization: `Bearer ${login.token}` },
    })
    const list = await listRes.json()
    assert(list.success && Array.isArray(list.agencies), 'list agencies')
    assert(list.pagination && typeof list.pagination.total === 'number', 'pagination present')

    // Owner token must not access agencies API
    const ownerEmail = process.env.OWNER_EMAIL
    const ownerPassword = process.env.OWNER_PASSWORD
    if (ownerEmail && ownerPassword) {
      const ownerLoginRes = await fetch(`${apiUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail, password: ownerPassword }),
      })
      const ownerLogin = await ownerLoginRes.json()
      if (ownerLogin.token) {
        const deniedRes = await fetch(`${apiUrl}/api/super-admin/agencies`, {
          headers: { Authorization: `Bearer ${ownerLogin.token}` },
        })
        assert(deniedRes.status === 403 || deniedRes.status === 401, 'owner denied agencies list')
      } else {
        console.log('SKIP owner isolation API check (owner login failed)')
      }
    } else {
      console.log('SKIP owner isolation API check (OWNER_EMAIL/PASSWORD not set)')
    }
  } catch (error) {
    console.error('FAIL live API', error.message)
    failed += 1
  }
} else {
  console.log('\nSKIP live API checks (set API_URL + SUPERADMIN_EMAIL + SUPERADMIN_PASSWORD to enable)')
}

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAgencies Phase 1 verification passed')

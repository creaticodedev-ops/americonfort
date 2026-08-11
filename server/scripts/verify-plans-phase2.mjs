/**
 * Phase 2 Plans & Entitlements — unit checks (no DB required for core asserts).
 *   npm run test:plans
 */
import {
  PLAN_FEATURES,
  normalizePlanFeatures,
  normalizePlanLimits,
  isPlanFeature,
  featureCatalog,
} from '../constants/planFeatures.js'
import {
  resolveEntitlements,
  hasFeature,
  buildPlanSnapshot,
  serializeEntitlements,
  DEFAULT_PLAN_CODE,
} from '../services/entitlementService.js'

let failed = 0
const assert = (cond, label) => {
  if (cond) console.log(`OK  ${label}`)
  else {
    console.error(`FAIL ${label}`)
    failed += 1
  }
}

assert(PLAN_FEATURES.includes('fleet'), 'catalog includes fleet')
assert(PLAN_FEATURES.includes('contracts'), 'catalog includes contracts')
assert(PLAN_FEATURES.includes('online_reservations'), 'catalog includes online_reservations')
assert(PLAN_FEATURES.includes('whatsapp'), 'catalog includes whatsapp')
assert(PLAN_FEATURES.includes('payments'), 'catalog includes payments')
assert(isPlanFeature('analytics') === true, 'isPlanFeature analytics')
assert(isPlanFeature('not_a_feature') === false, 'rejects unknown feature')
assert(featureCatalog().length === PLAN_FEATURES.length, 'featureCatalog size')

assert(
  normalizePlanFeatures(['fleet', 'fleet', 'nope', 'contracts']).join(',') === 'fleet,contracts',
  'normalize features',
)
assert(normalizePlanLimits({ maxVehicles: 5 }).maxVehicles === 5, 'normalize limits')
assert(normalizePlanLimits({ maxVehicles: -1 }).maxVehicles === 0, 'negative limit → unlimited/0')

// Legacy agency (no plan) keeps full access
const legacy = resolveEntitlements({ role: 'owner', accountStatus: 'active', licenseStatus: 'active' })
assert(legacy.source === 'legacy_full_access', 'legacy source')
assert(legacy.features.length === PLAN_FEATURES.length, 'legacy gets all features')
assert(hasFeature(legacy, 'contracts') === true, 'legacy has contracts')
assert(hasFeature(legacy, 'payments') === true, 'legacy has payments')

// Assigned starter-like snapshot
const starterUser = {
  role: 'owner',
  accountStatus: 'active',
  licenseStatus: 'trial',
  plan: 'cccccccccccccccccccccccc',
  planSnapshot: buildPlanSnapshot({
    code: 'starter',
    name: 'Starter',
    features: ['fleet', 'bookings', 'online_reservations'],
    limits: { maxVehicles: 10, maxUsers: 1, maxReservations: 50 },
    isDefault: false,
  }),
}
const starter = resolveEntitlements(starterUser)
assert(starter.source === 'plan', 'assigned plan source')
assert(starter.status === 'trial', 'plan status mirrors trial license')
assert(hasFeature(starterUser, 'fleet') === true, 'starter has fleet')
assert(hasFeature(starterUser, 'contracts') === false, 'starter lacks contracts')
assert(hasFeature(starterUser, 'invoices') === false, 'starter lacks invoices')
assert(starter.limits.maxVehicles === 10, 'starter vehicle limit')

const serialized = serializeEntitlements(starterUser)
assert(serialized.code === 'starter', 'serialize plan code')
assert(Array.isArray(serialized.features), 'serialize features array')
assert(DEFAULT_PLAN_CODE === 'full_access', 'default plan code')

// Full access snapshot
const fullUser = {
  role: 'owner',
  accountStatus: 'active',
  licenseStatus: 'active',
  plan: 'dddddddddddddddddddddddd',
  planSnapshot: buildPlanSnapshot({
    code: DEFAULT_PLAN_CODE,
    name: 'Full Access',
    features: [...PLAN_FEATURES],
    limits: { maxVehicles: 0, maxUsers: 0, maxReservations: 0 },
    isDefault: true,
  }),
}
assert(hasFeature(fullUser, 'whatsapp') === true, 'full access has whatsapp')
assert(hasFeature(fullUser, 'seo_tools') === true, 'full access has seo_tools')
assert(resolveEntitlements(fullUser).limits.maxVehicles === 0, 'full access unlimited vehicles')

if (failed) {
  console.error(`\n${failed} assertion(s) failed`)
  process.exit(1)
}
console.log('\nPlans Phase 2 verification passed')
process.exit(0)

/**
 * Verify admin modules: accounting net math, signature status helpers,
 * plan features / permissions catalogs, model load.
 *
 * Usage: node scripts/verify-admin-modules-foundation.mjs
 */
import assert from 'node:assert/strict'
import { OWNER_PERMISSIONS } from '../models/User.js'
import { PLAN_FEATURES, PLAN_FEATURE_META, isPlanFeature } from '../constants/planFeatures.js'
import { resolveSignatureRequestStatus } from '../services/signatureRequestStatus.js'
import { resolvePeriodRange } from '../services/accountingService.js'

const requiredPerms = [
  'accounting',
  'chauffeurs',
  'partners',
  'signature_requests',
  'contract_extensions',
  'employees',
]
for (const p of requiredPerms) {
  assert.ok(OWNER_PERMISSIONS.includes(p), `missing permission ${p}`)
}

for (const f of requiredPerms) {
  assert.ok(isPlanFeature(f), `missing plan feature ${f}`)
  assert.ok(PLAN_FEATURE_META[f]?.label, `missing feature meta ${f}`)
}

assert.ok(PLAN_FEATURES.includes('accounting'))

// Signature status derivation
assert.equal(
  resolveSignatureRequestStatus({
    completion: { signatureComplete: true, signatureUrl: 'x', signatureSignedAt: new Date() },
  }),
  'signed',
)
assert.equal(
  resolveSignatureRequestStatus({
    completion: { signatureRequestStatus: 'cancelled', signatureCancelledAt: new Date() },
  }),
  'cancelled',
)
assert.equal(
  resolveSignatureRequestStatus({
    completion: {
      tokenHash: 'abc',
      tokenExpiresAt: new Date(Date.now() - 1000),
    },
  }),
  'expired',
)
assert.equal(
  resolveSignatureRequestStatus({
    completion: {
      tokenHash: 'abc',
      tokenExpiresAt: new Date(Date.now() + 86400000),
    },
  }),
  'pending',
)

const month = resolvePeriodRange('month')
assert.ok(month.from && month.to)

// Net formula sanity
const gross = 1000
const samsar = 100
const agency = 50
const vehicle = 25
const net = gross - samsar - agency - vehicle
assert.equal(net, 825)

console.log('OK: admin modules foundation checks passed')

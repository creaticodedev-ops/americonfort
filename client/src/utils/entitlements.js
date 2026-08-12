/**
 * Client-side entitlement helpers.
 * UI gating only — the API remains the authority (FEATURE_NOT_IN_PLAN / PLAN_LIMIT_REACHED).
 *
 * Feature keys and plan names are not hardcoded here; they come from the
 * entitlements payload (and Super Admin featureCatalog from the Plans API).
 */

export const resolveEntitlements = (userOrEntitlements) => {
  if (!userOrEntitlements) {
    return { features: [], limits: {}, code: '', name: '', status: 'unknown', source: 'none' }
  }
  if (Array.isArray(userOrEntitlements.features) && !userOrEntitlements.role) {
    return userOrEntitlements
  }
  return (
    userOrEntitlements.entitlements || {
      features: userOrEntitlements.planSnapshot?.features || [],
      limits: userOrEntitlements.planSnapshot?.limits || {},
      code: userOrEntitlements.planSnapshot?.code || '',
      name: userOrEntitlements.planSnapshot?.name || '',
      status: 'unknown',
      source: userOrEntitlements.planSnapshot?.code ? 'plan' : 'none',
    }
  )
}

/**
 * Missing/empty entitlements on a logged-in owner are treated as full access
 * until the server sync assigns the default plan (matches backend legacy rule).
 * Full Access / default plan always unlocks the full UI catalog (matches server).
 */
export const hasFeature = (userOrEntitlements, featureKey) => {
  if (!featureKey) return true
  const entitlements = resolveEntitlements(userOrEntitlements)
  if (entitlements.isDefault || entitlements.code === 'full_access') return true
  const features = entitlements.features
  if (!Array.isArray(features) || features.length === 0) {
    // Legacy / not yet synced — do not lock the UI ahead of the API
    return entitlements.source === 'none' || entitlements.source === 'legacy_full_access' || !entitlements.code
      ? true
      : false
  }
  return features.includes(featureKey)
}

export const getPlanLimits = (userOrEntitlements) => {
  const entitlements = resolveEntitlements(userOrEntitlements)
  return entitlements.limits || {}
}

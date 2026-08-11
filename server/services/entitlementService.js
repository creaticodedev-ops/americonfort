/**
 * Central SaaS entitlements resolver.
 * Backend is the authority — UI hiding is never security.
 *
 * Rules:
 * - Missing plan / empty snapshot → full access (legacy-safe) until sync assigns default.
 * - Assigned plan with explicit features list → only those features.
 * - Limits: 0 means unlimited. Enforced at write time only.
 */

import Plan from '../models/Plan.js';
import User from '../models/User.js';
import Car from '../models/Car.js';
import Booking from '../models/Booking.js';
import {
  PLAN_FEATURES,
  UNLIMITED_LIMITS,
  featureCatalog,
  isPlanFeature,
  normalizePlanFeatures,
  normalizePlanLimits,
} from '../constants/planFeatures.js';

export const FEATURE_NOT_IN_PLAN = 'FEATURE_NOT_IN_PLAN';
export const PLAN_LIMIT_REACHED = 'PLAN_LIMIT_REACHED';

export const DEFAULT_PLAN_CODE = 'full_access';

const emptySnapshot = () => ({
  code: '',
  name: '',
  features: [],
  limits: { ...UNLIMITED_LIMITS },
  isDefault: false,
  assignedAt: null,
});

export const buildPlanSnapshot = (plan, assignedAt = new Date()) => {
  if (!plan) return emptySnapshot();
  return {
    code: plan.code || '',
    name: plan.name || '',
    features: normalizePlanFeatures(plan.features),
    limits: normalizePlanLimits(plan.limits),
    isDefault: Boolean(plan.isDefault),
    assignedAt: assignedAt || new Date(),
  };
};

/**
 * Resolve effective entitlements for an owner user.
 * Never throws — safe defaults preserve existing agency behavior.
 */
export const resolveEntitlements = (user) => {
  const snap = user?.planSnapshot && typeof user.planSnapshot === 'object'
    ? user.planSnapshot
    : null;
  const hasAssignedPlan = Boolean(user?.plan) || Boolean(snap?.code);

  if (!hasAssignedPlan) {
    return {
      planId: null,
      code: '',
      name: '',
      status: 'legacy',
      features: [...PLAN_FEATURES],
      limits: { ...UNLIMITED_LIMITS },
      isDefault: false,
      source: 'legacy_full_access',
      assignedAt: null,
      catalog: featureCatalog(),
    };
  }

  const features = normalizePlanFeatures(snap?.features);
  const limits = normalizePlanLimits(snap?.limits);

  // Derive plan commercial status from existing license fields (no billing yet)
  let status = 'active';
  if ((user.accountStatus || 'active') === 'pending') status = 'pending';
  else if (user.accountStatus === 'suspended' || user.accountStatus === 'disabled') status = 'suspended';
  else if ((user.licenseStatus || 'trial') === 'trial') status = 'trial';
  else if ((user.licenseStatus || '') === 'expired') status = 'expired';

  return {
    planId: user.plan?.toString?.() || (user.plan ? String(user.plan) : null),
    code: snap?.code || '',
    name: snap?.name || snap?.code || 'Plan',
    status,
    features,
    limits,
    isDefault: Boolean(snap?.isDefault),
    source: 'plan',
    assignedAt: snap?.assignedAt || null,
    catalog: featureCatalog(),
  };
};

export const hasFeature = (userOrEntitlements, featureKey) => {
  if (!isPlanFeature(featureKey)) return false;
  const entitlements = userOrEntitlements?.features
    && Array.isArray(userOrEntitlements.features)
    && !userOrEntitlements.role
    ? userOrEntitlements
    : resolveEntitlements(userOrEntitlements);
  return entitlements.features.includes(featureKey);
};

export const serializeEntitlements = (user) => {
  const entitlements = resolveEntitlements(user);
  return {
    planId: entitlements.planId,
    code: entitlements.code,
    name: entitlements.name,
    status: entitlements.status,
    features: entitlements.features,
    limits: entitlements.limits,
    isDefault: entitlements.isDefault,
    source: entitlements.source,
    assignedAt: entitlements.assignedAt,
  };
};

let defaultPlanCache = { plan: null, expiresAt: 0 };

export const invalidateDefaultPlanCache = () => {
  defaultPlanCache = { plan: null, expiresAt: 0 };
};

export const getDefaultPlan = async ({ bypassCache = false } = {}) => {
  const now = Date.now();
  if (!bypassCache && defaultPlanCache.plan && defaultPlanCache.expiresAt > now) {
    return defaultPlanCache.plan;
  }

  let plan = await Plan.findOne({ isDefault: true, isActive: true });
  if (!plan) {
    plan = await Plan.findOne({ code: DEFAULT_PLAN_CODE });
  }
  if (!plan) {
    plan = await ensureDefaultPlans();
  }

  defaultPlanCache = { plan, expiresAt: now + 60_000 };
  return plan;
};

/**
 * Idempotent seed of the safe Full Access default plan (+ optional starter).
 * Existing agencies rely on Full Access so nothing breaks.
 */
export const ensureDefaultPlans = async () => {
  let full = await Plan.findOne({ code: DEFAULT_PLAN_CODE });
  if (!full) {
    full = await Plan.create({
      code: DEFAULT_PLAN_CODE,
      name: 'Full Access',
      description:
        'Default plan for existing agencies. Includes all product features with unlimited usage.',
      features: [...PLAN_FEATURES],
      limits: { ...UNLIMITED_LIMITS },
      isActive: true,
      isDefault: true,
      sortOrder: 0,
    });
  } else {
    let dirty = false;
    if (!full.isDefault) {
      full.isDefault = true;
      dirty = true;
    }
    if (!full.isActive) {
      full.isActive = true;
      dirty = true;
    }
    // Keep grandfathered plan covering the full catalog as features are added
    const missing = PLAN_FEATURES.filter((f) => !full.features.includes(f));
    if (missing.length) {
      full.features = normalizePlanFeatures([...full.features, ...missing]);
      dirty = true;
    }
    if (dirty) await full.save();
  }

  // Ensure only one default
  await Plan.updateMany(
    { _id: { $ne: full._id }, isDefault: true },
    { $set: { isDefault: false } },
  );

  const starter = await Plan.findOne({ code: 'starter' });
  if (!starter) {
    await Plan.create({
      code: 'starter',
      name: 'Starter',
      description: 'Core rental operations with vehicle and reservation limits.',
      features: normalizePlanFeatures([
        'fleet',
        'bookings',
        'online_reservations',
        'whatsapp',
        'contracts',
        'invoices',
        'customers',
        'calendar',
        'payments',
        'agency',
      ]),
      limits: { maxVehicles: 10, maxUsers: 2, maxReservations: 200 },
      isActive: true,
      isDefault: false,
      sortOrder: 10,
    });
  }

  invalidateDefaultPlanCache();
  return full;
};

export const applyPlanToUser = async (user, plan, { save = true } = {}) => {
  if (!user || !plan) throw new Error('User and plan are required');
  user.plan = plan._id;
  user.planSnapshot = buildPlanSnapshot(plan, new Date());
  user.markModified('planSnapshot');
  if (save) await user.save();
  return user;
};

/**
 * Lazy migration: assign default Full Access plan when an owner has none.
 * Safe to call on every owner request (no-op when already assigned).
 */
export const syncOwnerPlan = async (user) => {
  if (!user || user.role !== 'owner') return user;
  if (user.plan && user.planSnapshot?.code) return user;

  const plan = await getDefaultPlan();
  if (!plan) return user;
  await applyPlanToUser(user, plan, { save: true });
  return user;
};

export const refreshSnapshotsForPlan = async (plan) => {
  if (!plan?._id) return 0;
  const snapshot = buildPlanSnapshot(plan, new Date());
  const result = await User.updateMany(
    { role: 'owner', plan: plan._id },
    { $set: { planSnapshot: snapshot } },
  );
  return result.modifiedCount || 0;
};

export const assertFeature = (user, featureKey) => {
  if (!hasFeature(user, featureKey)) {
    const err = new Error(`Feature "${featureKey}" is not included in this agency plan`);
    err.code = FEATURE_NOT_IN_PLAN;
    err.feature = featureKey;
    err.status = 403;
    throw err;
  }
};

/**
 * Write-time quota check. Read paths never hide existing data for over-limit agencies.
 */
export const checkPlanLimit = async (user, limitKey) => {
  const entitlements = resolveEntitlements(user);
  const max = Number(entitlements.limits?.[limitKey] ?? 0);
  if (!max || max <= 0) {
    return { allowed: true, limit: 0, current: null, remaining: null, unlimited: true };
  }

  const ownerId = user._id;
  let current = 0;
  if (limitKey === 'maxVehicles') {
    current = await Car.countDocuments({ owner: ownerId });
  } else if (limitKey === 'maxUsers') {
    current = await User.countDocuments({ _id: ownerId, role: 'owner' });
  } else if (limitKey === 'maxReservations') {
    current = await Booking.countDocuments({ owner: ownerId });
  } else {
    return { allowed: true, limit: max, current: 0, remaining: max, unlimited: false };
  }

  const allowed = current < max;
  return {
    allowed,
    limit: max,
    current,
    remaining: Math.max(0, max - current),
    unlimited: false,
  };
};

export const serializePlan = (plan) => {
  if (!plan) return null;
  const obj = plan.toObject ? plan.toObject() : { ...plan };
  return {
    id: obj._id?.toString?.() || String(obj._id),
    code: obj.code,
    name: obj.name,
    description: obj.description || '',
    features: normalizePlanFeatures(obj.features),
    limits: normalizePlanLimits(obj.limits),
    isActive: Boolean(obj.isActive),
    isDefault: Boolean(obj.isDefault),
    sortOrder: obj.sortOrder ?? 100,
    createdAt: obj.createdAt || null,
    updatedAt: obj.updatedAt || null,
  };
};

export default {
  FEATURE_NOT_IN_PLAN,
  PLAN_LIMIT_REACHED,
  DEFAULT_PLAN_CODE,
  resolveEntitlements,
  hasFeature,
  serializeEntitlements,
  buildPlanSnapshot,
  ensureDefaultPlans,
  getDefaultPlan,
  applyPlanToUser,
  syncOwnerPlan,
  refreshSnapshotsForPlan,
  assertFeature,
  checkPlanLimit,
  serializePlan,
  invalidateDefaultPlanCache,
};

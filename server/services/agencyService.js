/**
 * Agency = User with role "owner".
 * SaaS display status is derived from accountStatus + licenseStatus so we do not
 * invent a parallel source of truth that could drift from login gates.
 */

import User from '../models/User.js';
import {
  activateLicense,
  createTrialDefaults,
  serializeLicense,
  startTrial,
  syncLicenseStatus,
} from './licenseService.js';
import { serializeEntitlements } from './entitlementService.js';

export const AGENCY_STATUSES = Object.freeze(['active', 'suspended', 'trial', 'pending']);

const emptyProfile = () => ({
  legalName: '',
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  country: 'Morocco',
  logo: '',
  primaryDomain: '',
});

export const getAgencyProfile = (user) => {
  const p = user?.agencyProfile && typeof user.agencyProfile === 'object'
    ? user.agencyProfile
    : {};
  return {
    ...emptyProfile(),
    legalName: p.legalName || '',
    phone: p.phone || '',
    whatsapp: p.whatsapp || user?.whatsappSettings?.reservationNumber || '',
    address: p.address || '',
    city: p.city || '',
    country: p.country || 'Morocco',
    logo: p.logo || user?.image || '',
    primaryDomain: p.primaryDomain || '',
  };
};

/**
 * Resolve SaaS agency status for UI/filters.
 * Priority: pending → suspended/disabled → expired license → trial → active
 */
export const resolveAgencyStatus = (user) => {
  const account = user?.accountStatus || 'active';
  if (account === 'pending') return 'pending';
  if (account === 'suspended' || account === 'disabled') return 'suspended';

  const license = user?.licenseStatus || 'trial';
  if (license === 'expired') return 'suspended';
  if (license === 'trial') return 'trial';
  if (license === 'active') return 'active';
  return 'trial';
};

/** Mongo filter fragment for a SaaS status value */
export const agencyStatusQuery = (status) => {
  if (!status || !AGENCY_STATUSES.includes(status)) return null;
  if (status === 'pending') return { accountStatus: 'pending' };
  if (status === 'suspended') {
    return {
      $or: [
        { accountStatus: { $in: ['suspended', 'disabled'] } },
        { accountStatus: 'active', licenseStatus: 'expired' },
      ],
    };
  }
  if (status === 'trial') {
    return { accountStatus: 'active', licenseStatus: 'trial' };
  }
  // active
  return { accountStatus: 'active', licenseStatus: 'active' };
};

/**
 * Apply a SaaS status onto the owner account (mutates user; caller saves).
 * Never deletes data. Suspend/pending bump tokenVersion to revoke sessions.
 */
export const applyAgencyStatus = async (user, status) => {
  if (!AGENCY_STATUSES.includes(status)) {
    throw new Error('Invalid agency status');
  }

  if (status === 'pending') {
    user.accountStatus = 'pending';
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    invalidateBookableOwnerCache();
    return user;
  }

  if (status === 'suspended') {
    user.accountStatus = 'suspended';
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    invalidateBookableOwnerCache();
    return user;
  }

  if (status === 'trial') {
    user.accountStatus = 'active';
    if (user.licenseStatus !== 'trial' || !user.trialEndsAt || new Date(user.trialEndsAt) <= new Date()) {
      await startTrial(user); // persists accountStatus + trial fields
    } else {
      user.licenseStatus = 'trial';
      await user.save();
    }
    invalidateBookableOwnerCache();
    return user;
  }

  // active — permanent access; data untouched
  user.accountStatus = 'active';
  await activateLicense(user);
  invalidateBookableOwnerCache();
  return user;
};

/**
 * Actionable health signals from real account/license/fleet data only.
 * Does not invent metrics — omit issues when data does not support them.
 */
export const deriveAgencyHealth = (user, stats = {}) => {
  const issues = [];
  const account = user?.accountStatus || 'active';
  // Evaluate as owner so unit payloads without role stay accurate
  const license = serializeLicense({ ...user, role: 'owner' });
  const fleet = Number(stats.fleetCount ?? stats.vehicles ?? 0);
  const bookableRaw = stats.bookableVehicles;
  const bookableKnown = bookableRaw !== undefined && bookableRaw !== null;
  const bookable = Number(bookableRaw ?? 0);

  if (account === 'pending') {
    issues.push({
      code: 'pending_account',
      severity: 'warning',
      message: 'Account is pending — owner login is blocked until activated.',
    });
  }
  if (account === 'suspended' || account === 'disabled') {
    issues.push({
      code: 'suspended_account',
      severity: 'critical',
      message: 'Account is suspended — dashboard access is blocked; data is preserved.',
    });
  }
  if (license.licenseStatus === 'expired' || license.allowed === false) {
    issues.push({
      code: 'expired_license',
      severity: 'critical',
      message: 'License/trial has expired — owner dashboard access is locked.',
    });
  }
  if (fleet === 0) {
    issues.push({
      code: 'no_vehicles',
      severity: 'warning',
      message: 'No vehicles in the fleet yet.',
    });
  } else if (bookableKnown && bookable === 0) {
    issues.push({
      code: 'no_bookable_vehicles',
      severity: 'warning',
      message: 'Fleet has vehicles, but none are currently bookable on the website.',
    });
  }

  return {
    ok: issues.length === 0,
    issueCount: issues.length,
    issues,
  };
};

export const serializeAgency = (user, stats = null) => {
  const profile = getAgencyProfile(user);
  const license = serializeLicense(user);
  const health = deriveAgencyHealth(user, stats || {});
  return {
    id: user._id?.toString?.() || String(user._id),
    name: user.agencyName || user.name || '',
    contactName: user.name || '',
    email: user.email || '',
    status: resolveAgencyStatus(user),
    accountStatus: user.accountStatus || 'active',
    licenseStatus: license.licenseStatus,
    license,
    profile,
    notes: user.notes || '',
    image: user.image || profile.logo || '',
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
    lastLoginAt: user.lastLoginAt || null,
    lastActivityAt: stats?.lastActivityAt || user.lastLoginAt || null,
    lastActivity: stats?.lastActivity || null,
    stats: stats || null,
    health,
    plan: serializeEntitlements(user),
  };
};

export const mergeAgencyProfile = (user, incoming = {}) => {
  if (!user.agencyProfile || typeof user.agencyProfile !== 'object') {
    user.agencyProfile = emptyProfile();
  }
  const keys = Object.keys(emptyProfile());
  for (const key of keys) {
    if (incoming[key] !== undefined) {
      user.agencyProfile[key] = String(incoming[key] ?? '').trim();
    }
  }
  // Keep agency display name + avatar in sync when provided
  if (incoming.logo !== undefined && incoming.logo) {
    user.image = String(incoming.logo).trim();
  }
  if (incoming.whatsapp !== undefined) {
    const digits = String(incoming.whatsapp || '').replace(/\D/g, '');
    if (!user.whatsappSettings) user.whatsappSettings = {};
    if (digits) user.whatsappSettings.reservationNumber = digits;
  }
  user.markModified('agencyProfile');
};

/** Owners whose vehicles may appear publicly / accept online bookings. */
export const isOwnerPubliclyBookable = (owner) => {
  if (!owner || owner.role !== 'owner') return false;
  if ((owner.accountStatus || 'active') !== 'active') return false;
  const license = owner.licenseStatus || 'trial';
  if (license === 'active') return true;
  if (license === 'trial') {
    if (!owner.trialEndsAt) return false;
    return new Date(owner.trialEndsAt) > new Date();
  }
  return false;
};

/** Cached briefly to avoid repeated owner scans on hot public catalog paths. */
let bookableOwnerCache = { ids: null, expiresAt: 0 };

export const getBookableOwnerIds = async ({ bypassCache = false } = {}) => {
  const now = Date.now();
  if (!bypassCache && bookableOwnerCache.ids && bookableOwnerCache.expiresAt > now) {
    return bookableOwnerCache.ids;
  }

  const owners = await User.find({
    role: 'owner',
    accountStatus: 'active',
    $or: [
      { licenseStatus: 'active' },
      { licenseStatus: 'trial', trialEndsAt: { $gt: new Date() } },
    ],
  })
    .select('_id')
    .lean();

  const ids = owners.map((o) => o._id);
  bookableOwnerCache = { ids, expiresAt: now + 30_000 };
  return ids;
};

export const invalidateBookableOwnerCache = () => {
  bookableOwnerCache = { ids: null, expiresAt: 0 };
};

export const createAgencyDefaults = ({ startTrial: shouldStartTrial = true, status = 'trial' } = {}) => {
  const trial = shouldStartTrial || status === 'trial'
    ? createTrialDefaults()
    : {
        licenseStatus: status === 'active' ? 'active' : 'expired',
        trialStartedAt: null,
        trialEndsAt: null,
        licensedAt: status === 'active' ? new Date() : null,
      };

  let accountStatus = 'active';
  if (status === 'pending') accountStatus = 'pending';
  if (status === 'suspended') accountStatus = 'suspended';
  if (status === 'active') {
    trial.licenseStatus = 'active';
    trial.licensedAt = trial.licensedAt || new Date();
  }

  return { ...trial, accountStatus };
};

export default {
  AGENCY_STATUSES,
  getAgencyProfile,
  resolveAgencyStatus,
  agencyStatusQuery,
  applyAgencyStatus,
  deriveAgencyHealth,
  serializeAgency,
  mergeAgencyProfile,
  createAgencyDefaults,
  isOwnerPubliclyBookable,
  getBookableOwnerIds,
  invalidateBookableOwnerCache,
};

import {
  evaluateLicense,
  syncLicenseStatus,
  LICENSE_EXPIRED_CODE,
} from '../services/licenseService.js';
import {
  resolveEntitlements,
  syncOwnerPlan,
} from '../services/entitlementService.js';
import { BRAND_NAME } from '../utils/brand.js';

/**
 * Ensures the authenticated user is the agency owner AND has an active license/trial.
 * Expired trials return 403 with code LICENSE_EXPIRED — data is never deleted.
 * Also lazily assigns the default SaaS plan so legacy agencies keep full access.
 */
export const requireOwner = async (req, res, next) => {
  try {
    if (req.user?.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (req.user.accountStatus && req.user.accountStatus !== 'active') {
      const pending = req.user.accountStatus === 'pending';
      return res.status(403).json({
        success: false,
        code: pending ? 'ACCOUNT_PENDING' : 'ACCOUNT_LOCKED',
        message: pending
          ? `This agency account is pending activation. Contact ${BRAND_NAME}.`
          : `This admin account has been suspended or disabled. Contact ${BRAND_NAME}.`,
      });
    }

    await syncLicenseStatus(req.user);
    const evaluation = evaluateLicense(req.user);

    if (!evaluation.allowed) {
      return res.status(403).json({
        success: false,
        code: LICENSE_EXPIRED_CODE,
        message: `Your trial has expired. Contact ${BRAND_NAME} to activate the full version.`,
        license: {
          licenseStatus: evaluation.status,
          trialEndsAt: evaluation.trialEndsAt,
          daysRemaining: 0,
          allowed: false,
        },
      });
    }

    await syncOwnerPlan(req.user);
    req.entitlements = resolveEntitlements(req.user);

    next();
  } catch (error) {
    console.error('[license]', error.message);
    return res.status(500).json({ success: false, message: 'License check failed' });
  }
};

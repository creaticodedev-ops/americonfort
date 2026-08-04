import {
  evaluateLicense,
  syncLicenseStatus,
  LICENSE_EXPIRED_CODE,
} from '../services/licenseService.js';
import { BRAND_NAME } from '../utils/brand.js';

/**
 * Ensures the authenticated user is the agency owner AND has an active license/trial.
 * Expired trials return 403 with code LICENSE_EXPIRED — data is never deleted.
 */
export const requireOwner = async (req, res, next) => {
  try {
    if (req.user?.role !== 'owner') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (req.user.accountStatus && req.user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_LOCKED',
        message: `This admin account has been suspended or disabled. Contact ${BRAND_NAME}.`,
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

    next();
  } catch (error) {
    console.error('[license]', error.message);
    return res.status(500).json({ success: false, message: 'License check failed' });
  }
};

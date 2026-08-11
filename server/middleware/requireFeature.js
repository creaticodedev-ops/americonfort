import { isPlanFeature } from '../constants/planFeatures.js';
import {
  FEATURE_NOT_IN_PLAN,
  hasFeature,
  resolveEntitlements,
} from '../services/entitlementService.js';

/**
 * Enforce a plan feature server-side.
 * Must run after protect + requireOwner (so plan sync has run).
 */
export const requireFeature = (featureKey) => (req, res, next) => {
  if (!isPlanFeature(featureKey)) {
    console.warn(`[entitlements] Unknown feature key in requireFeature: ${featureKey}`);
    return res.status(500).json({
      success: false,
      message: 'Invalid feature configuration',
    });
  }

  const entitlements = req.entitlements || resolveEntitlements(req.user);
  req.entitlements = entitlements;

  if (!hasFeature(entitlements, featureKey)) {
    return res.status(403).json({
      success: false,
      code: FEATURE_NOT_IN_PLAN,
      feature: featureKey,
      message: `Your current plan does not include this feature (${featureKey}).`,
      entitlements: {
        code: entitlements.code,
        name: entitlements.name,
        features: entitlements.features,
      },
    });
  }

  return next();
};

export default requireFeature;

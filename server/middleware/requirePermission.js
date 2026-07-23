import { OWNER_PERMISSIONS } from '../models/User.js';
import { resolveOwnerPermissions } from '../utils/ownerPermissions.js';

/**
 * Empty permissions[] = full access (default).
 * Otherwise the requested permission key must be present.
 */
export const requirePermission = (permission) => (req, res, next) => {
  if (!OWNER_PERMISSIONS.includes(permission)) {
    return next();
  }

  const perms = resolveOwnerPermissions(req.user?.permissions);
  if (!Array.isArray(perms) || perms.length === 0) {
    return next(); // full access
  }

  if (!perms.includes(permission)) {
    return res.status(403).json({
      success: false,
      message: `Missing permission: ${permission}`,
      code: 'PERMISSION_DENIED',
    });
  }

  next();
};

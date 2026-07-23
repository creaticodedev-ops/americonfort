import { OWNER_PERMISSIONS } from '../models/User.js';

/**
 * Expand legacy owner permission lists when new modules are added.
 * Empty permissions[] remains full access (unchanged).
 */
export const resolveOwnerPermissions = (permissions) => {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return permissions;
  }

  const missing = OWNER_PERMISSIONS.filter((p) => !permissions.includes(p));
  if (missing.length === 0) return permissions;

  const priorCatalogSize = OWNER_PERMISSIONS.length - missing.length;
  if (permissions.length >= priorCatalogSize) {
    return [...new Set([...permissions, ...missing])];
  }

  return permissions;
};

/** Persist expanded permissions for owners when the catalog grows. */
export const syncOwnerPermissions = async (user) => {
  if (!user || user.role !== 'owner') return user;

  const current = user.permissions;
  if (!Array.isArray(current) || current.length === 0) return user;

  const resolved = resolveOwnerPermissions(current);
  if (resolved.length === current.length) return user;

  user.permissions = resolved;
  await user.save();
  return user;
};

export default { resolveOwnerPermissions, syncOwnerPermissions };

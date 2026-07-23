/** Keep in sync with server/models/User.js OWNER_PERMISSIONS */
export const OWNER_PERMISSIONS = [
  'dashboard',
  'analytics',
  'fleet',
  'bookings',
  'customers',
  'locations',
  'calendar',
  'maintenance',
  'reports',
  'audit',
  'contracts',
  'templates',
];

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

export const ownerHasPermission = (user, permission) => {
  if (!permission) return true;
  const perms = resolveOwnerPermissions(user?.permissions);
  if (!Array.isArray(perms) || perms.length === 0) return true;
  return perms.includes(permission);
};

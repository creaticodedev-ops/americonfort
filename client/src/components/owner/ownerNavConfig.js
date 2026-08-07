import { ownerMenuLinks } from '../../assets/assets'

/**
 * Admin navigation architecture — groups existing ownerMenuLinks without
 * changing paths, permissions, or icons. Scalable: add a path to a group
 * (or a new group) when modules grow.
 */
export const OWNER_NAV_GROUPS = [
  {
    id: 'overview',
    labelKey: 'admin.menu.groups.overview',
    paths: ['/owner', '/owner/analytics'],
  },
  {
    id: 'bookings',
    labelKey: 'admin.menu.groups.bookings',
    paths: ['/owner/manage-bookings', '/owner/walk-in', '/owner/calendar', '/owner/customers'],
  },
  {
    id: 'fleet',
    labelKey: 'admin.menu.groups.fleet',
    paths: [
      '/owner/add-car',
      '/owner/manage-cars',
      '/owner/vehicle-stats',
      '/owner/maintenance',
      '/owner/locations',
    ],
  },
  {
    id: 'documents',
    labelKey: 'admin.menu.groups.documents',
    paths: ['/owner/contracts', '/owner/invoices', '/owner/templates'],
  },
  {
    id: 'reporting',
    labelKey: 'admin.menu.groups.reporting',
    paths: ['/owner/reports', '/owner/audit'],
  },
]

const linkByPath = Object.fromEntries(ownerMenuLinks.map((link) => [link.path, link]))

/** Extra path prefixes that should highlight a related menu item */
const RELATED_ACTIVE = {
  '/owner/manage-cars': ['/owner/edit-car'],
  '/owner/vehicle-stats': ['/owner/vehicle-stats'],
}

export const isOwnerNavPathActive = (pathname, path) => {
  if (path === '/owner') return pathname === '/owner'
  if (pathname === path || pathname.startsWith(`${path}/`)) return true
  const related = RELATED_ACTIVE[path] || []
  return related.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export const getGroupedOwnerNav = (hasPermission) =>
  OWNER_NAV_GROUPS.map((group) => ({
    id: group.id,
    labelKey: group.labelKey,
    items: group.paths
      .map((path) => linkByPath[path])
      .filter((link) => link && hasPermission(link.permission)),
  })).filter((group) => group.items.length > 0)

export const findActiveOwnerNavGroupId = (pathname, groups) => {
  for (const group of groups) {
    if (group.items.some((item) => isOwnerNavPathActive(pathname, item.path))) {
      return group.id
    }
  }
  return null
}

export const OWNER_NAV_STORAGE_KEY = 'americonfort.owner.navGroups.v1'

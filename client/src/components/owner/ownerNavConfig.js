import { ownerMenuLinks } from '../../assets/ownerAssets'

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
    paths: [
      '/owner/manage-bookings',
      '/owner/walk-in',
      '/owner/calendar',
      '/owner/customers',
      '/owner/signature-requests',
    ],
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
      '/owner/chauffeurs',
    ],
  },
  {
    id: 'partners',
    labelKey: 'admin.menu.groups.partners',
    paths: ['/owner/samsars', '/owner/partner-companies'],
  },
  {
    id: 'documents',
    labelKey: 'admin.menu.groups.documents',
    paths: ['/owner/contracts', '/owner/invoices', '/owner/templates'],
  },
  {
    id: 'accounting',
    labelKey: 'admin.menu.groups.accounting',
    paths: [
      '/owner/accounting',
      '/owner/accounting/revenues',
      '/owner/accounting/samsar-payments',
      '/owner/accounting/agency-expenses',
      '/owner/accounting/vehicle-expenses',
    ],
  },
  {
    id: 'reporting',
    labelKey: 'admin.menu.groups.reporting',
    paths: ['/owner/reports', '/owner/audit'],
  },
  {
    id: 'settings',
    labelKey: 'admin.menu.groups.settings',
    paths: ['/owner/settings'],
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

export const getGroupedOwnerNav = (hasPermission, hasFeature = () => true) =>
  OWNER_NAV_GROUPS.map((group) => ({
    id: group.id,
    labelKey: group.labelKey,
    items: group.paths
      .map((path) => linkByPath[path])
      .filter((link) => {
        if (!link) return false
        // null/undefined permission = always show for authenticated owners
        if (link.permission != null && !hasPermission(link.permission)) return false
        // Plan entitlement (UI only — API still enforces)
        if (link.feature != null && !hasFeature(link.feature)) return false
        return true
      }),
  })).filter((group) => group.items.length > 0)

export const findActiveOwnerNavGroupId = (pathname, groups) => {
  for (const group of groups) {
    if (group.items.some((item) => isOwnerNavPathActive(pathname, item.path))) {
      return group.id
    }
  }
  return null
}

export const OWNER_NAV_STORAGE_KEY = 'americonfort.owner.navGroups.v2'

import { ownerMenuLinks } from '../../assets/ownerAssets'

/**
 * Workflow-based Admin IA — existing routes only (no duplicates).
 * MAIN / OPERATIONS / FINANCE / DOCUMENTS / MANAGEMENT / SETTINGS
 */
export const OWNER_NAV_GROUPS = [
  {
    id: 'main',
    labelKey: 'admin.menu.groups.main',
    paths: ['/owner'],
  },
  {
    id: 'operations',
    labelKey: 'admin.menu.groups.operations',
    paths: [
      '/owner/manage-bookings',
      '/owner/calendar',
      '/owner/manage-cars',
      '/owner/chauffeurs',
      '/owner/samsars',
      '/owner/partner-companies',
      '/owner/employees',
      '/owner/customers',
      '/owner/locations',
      '/owner/vehicle-stats',
      '/owner/add-car',
    ],
  },
  {
    id: 'finance',
    labelKey: 'admin.menu.groups.finance',
    paths: [
      '/owner/accounting',
      '/owner/accounting/revenues',
      '/owner/accounting/samsar-payments',
      '/owner/accounting/agency-expenses',
      '/owner/accounting/vehicle-expenses',
    ],
  },
  {
    id: 'documents',
    labelKey: 'admin.menu.groups.documents',
    paths: [
      '/owner/contracts',
      '/owner/signature-requests',
      '/owner/invoices',
      '/owner/templates',
    ],
  },
  {
    id: 'management',
    labelKey: 'admin.menu.groups.management',
    paths: [
      '/owner/walk-in',
      '/owner/maintenance',
      '/owner/reports',
      '/owner/analytics',
      '/owner/audit',
    ],
  },
  {
    id: 'settings',
    labelKey: 'admin.menu.groups.settings',
    paths: ['/owner/settings'],
  },
]

const linkByPath = Object.fromEntries(ownerMenuLinks.map((link) => [link.path, link]))

const RELATED_ACTIVE = {
  '/owner/manage-cars': ['/owner/edit-car'],
  '/owner/vehicle-stats': ['/owner/vehicle-stats'],
  '/owner/settings': ['/owner/settings'],
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
        if (link.permission != null && !hasPermission(link.permission)) return false
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

export const getOwnerPageMeta = (pathname, t) => {
  const exact = ownerMenuLinks.find((l) => l.path === pathname)
  if (exact) {
    return {
      title: t(exact.nameKey),
      description: null,
    }
  }
  const fuzzy = ownerMenuLinks.find(
    (l) => l.path !== '/owner' && (pathname === l.path || pathname.startsWith(`${l.path}/`)),
  )
  if (fuzzy) return { title: t(fuzzy.nameKey), description: null }
  if (pathname.startsWith('/owner/edit-car')) return { title: t('admin.menu.fleet'), description: null }
  if (pathname.startsWith('/owner/settings')) return { title: t('admin.menu.settings'), description: null }
  return { title: t('admin.menu.dashboard'), description: null }
}

/** Quick-create targets for contextual admin actions */
export const OWNER_QUICK_ACTIONS = [
  { labelKey: 'admin.quick.newReservation', path: '/owner/walk-in', permission: 'bookings', feature: 'bookings' },
  { labelKey: 'admin.quick.newVehicle', path: '/owner/add-car', permission: 'fleet', feature: 'fleet' },
  { labelKey: 'admin.quick.newChauffeur', path: '/owner/chauffeurs', permission: 'chauffeurs', feature: 'chauffeurs' },
  { labelKey: 'admin.quick.newSamsar', path: '/owner/samsars', permission: 'partners', feature: 'partners' },
  { labelKey: 'admin.quick.newPartner', path: '/owner/partner-companies', permission: 'partners', feature: 'partners' },
  { labelKey: 'admin.quick.newEmployee', path: '/owner/employees', permission: 'employees', feature: 'employees' },
]

export const OWNER_NAV_STORAGE_KEY = 'americonfort.owner.navGroups.v4'
export const OWNER_SIDEBAR_COLLAPSED_KEY = 'americonfort.owner.sidebarCollapsed.v1'
export const OWNER_NAV_GROUP_EXPANDED_KEY = 'americonfort.owner.navGroupExpanded.v1'

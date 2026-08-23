import { ownerMenuLinks } from '../../assets/ownerAssets'

/**
 * Enterprise Admin IA — existing routes only (no duplicates / dead links).
 * MAIN / OPERATIONS / PARTNERS / FINANCE / DOCUMENTS / INSIGHTS / MANAGEMENT / SETTINGS
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
      '/owner/signature-requests',
      '/owner/manage-cars',
      '/owner/chauffeurs',
      '/owner/maintenance',
      '/owner/customers',
      '/owner/client-documents',
      '/owner/walk-in',
    ],
  },
  {
    id: 'partners',
    labelKey: 'admin.menu.groups.partners',
    paths: ['/owner/samsars', '/owner/partner-companies', '/owner/employees'],
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
    paths: ['/owner/contracts', '/owner/invoices', '/owner/templates'],
  },
  {
    id: 'insights',
    labelKey: 'admin.menu.groups.insights',
    paths: ['/owner/vehicle-stats', '/owner/reports', '/owner/analytics'],
  },
  {
    id: 'management',
    labelKey: 'admin.menu.groups.management',
    paths: ['/owner/locations', '/owner/staff', '/owner/audit'],
  },
  {
    id: 'settings',
    labelKey: 'admin.menu.groups.settings',
    paths: [
      '/owner/settings',
      '/owner/settings/general',
      '/owner/settings/branding',
      '/owner/settings/domains',
    ],
  },
]

const linkByPath = Object.fromEntries(ownerMenuLinks.map((link) => [link.path, link]))

const RELATED_ACTIVE = {
  '/owner/manage-cars': ['/owner/edit-car'],
  '/owner/vehicle-stats': ['/owner/vehicle-stats'],
}

const SETTINGS_SIDEBAR_LEAVES = [
  '/owner/settings/general',
  '/owner/settings/branding',
  '/owner/settings/domains',
]

export const isOwnerNavPathActive = (pathname, path) => {
  if (path === '/owner') return pathname === '/owner'
  if (path === '/owner/accounting') return pathname === '/owner/accounting'
  if (path === '/owner/settings') {
    if (pathname === '/owner/settings' || pathname === '/owner/settings/') return true
    if (!pathname.startsWith('/owner/settings/')) return false
    return !SETTINGS_SIDEBAR_LEAVES.some(
      (leaf) => pathname === leaf || pathname.startsWith(`${leaf}/`),
    )
  }
  if (pathname === path || pathname.startsWith(`${path}/`)) return true
  const related = RELATED_ACTIVE[path] || []
  return related.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export const getGroupedOwnerNav = (hasPermission, hasFeature = () => true) =>
  OWNER_NAV_GROUPS.map((group) => ({
    id: group.id,
    labelKey: group.labelKey,
    items: group.paths
      .map((p) => linkByPath[p])
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
  const fuzzy = [...ownerMenuLinks]
    .sort((a, b) => b.path.length - a.path.length)
    .find((l) => l.path !== '/owner' && (pathname === l.path || pathname.startsWith(`${l.path}/`)))
  if (fuzzy) return { title: t(fuzzy.nameKey), description: null }
  if (pathname.startsWith('/owner/edit-car')) return { title: t('admin.menu.fleet'), description: null }
  if (pathname.startsWith('/owner/add-car')) return { title: t('admin.menu.addCar'), description: null }
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

export const OWNER_NAV_STORAGE_KEY = 'americonfort.owner.navGroups.v5'
export const OWNER_SIDEBAR_COLLAPSED_KEY = 'americonfort.owner.sidebarCollapsed.v1'
export const OWNER_NAV_GROUP_EXPANDED_KEY = 'americonfort.owner.navGroupExpanded.v1'

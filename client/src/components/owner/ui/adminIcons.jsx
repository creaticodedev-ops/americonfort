import React from 'react'

/** Lightweight inline SVG icons for the admin shell (no new icon dependency). */
export const Icon = ({ name, className = 'h-4 w-4', ...props }) => {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      )
    case 'bookings':
      return (
        <svg {...common}>
          <path d="M8 4h8a2 2 0 012 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 012-2z" />
          <path d="M9 10h6M9 14h4" />
        </svg>
      )
    case 'walk-in':
      return (
        <svg {...common}>
          <path d="M4 20V9.5L12 4l8 5.5V20" />
          <path d="M9 20v-6h6v6" />
        </svg>
      )
    case 'car':
      return (
        <svg {...common}>
          <path d="M5 16l1.5-5.5A2 2 0 018.4 9h7.2a2 2 0 011.9 1.5L19 16" />
          <path d="M5 16h14v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z" />
          <circle cx="7.5" cy="16" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="16" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'wrench':
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.1 2.1-1.9-.1-.1-1.9 2.1-2.1z" />
        </svg>
      )
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 19.5a6.5 6.5 0 0113 0" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="3.5" />
          <path d="M22 21v-2a3.5 3.5 0 00-2.5-3.35M16.5 3.7a3.5 3.5 0 010 6.6" />
        </svg>
      )
    case 'id-badge':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M8.5 16.5a3.5 3.5 0 017 0" />
        </svg>
      )
    case 'steering':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.25" />
          <path d="M12 4v5.5M7.2 18.2l3.2-3.2M16.8 18.2l-3.2-3.2" />
        </svg>
      )
    case 'building':
      return (
        <svg {...common}>
          <path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M4 21h16M10 21v-4h4v4M8 8h.01M12 8h.01M8 12h.01M12 12h.01" />
        </svg>
      )
    case 'handshake':
      return (
        <svg {...common}>
          <path d="M8 13l2.5 2.5a2 2 0 002.8 0L17 12" />
          <path d="M4 11l3-3 3.5 2M20 11l-3-3-2.5 1.5" />
          <path d="M9 16.5L7.5 18a2 2 0 01-2.8 0L3 16.3" />
        </svg>
      )
    case 'signature':
      return (
        <svg {...common}>
          <path d="M3 17c2-1 3.5-3 5-3s2.5 2 4 2 3-2 5-2 3 1 4 2" />
          <path d="M14 7l3 3M17 4l3 3" />
        </svg>
      )
    case 'file':
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
      )
    case 'folder':
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      )
    case 'invoice':
      return (
        <svg {...common}>
          <path d="M7 3h10a1 1 0 011 1v16l-2-1.2L14 20l-2-1.2L10 20l-2-1.2L6 20V4a1 1 0 011-1z" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      )
    case 'layout':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M10 10v10" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 16V10M12 16V7M16 16v-4" />
        </svg>
      )
    case 'report':
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
          <path d="M14 3v4h4M9 13h6M9 17h4M9 9h2" />
        </svg>
      )
    case 'wallet':
      return (
        <svg {...common}>
          <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          <path d="M3 10h18M16 14h.01" />
        </svg>
      )
    case 'coins':
      return (
        <svg {...common}>
          <ellipse cx="10" cy="7" rx="6" ry="3" />
          <path d="M4 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
          <path d="M14 10c2.8.4 5 1.6 5 3.2V18c0 1.7-2.7 3-6 3-1.4 0-2.7-.3-3.7-.7" />
        </svg>
      )
    case 'receipt':
      return (
        <svg {...common}>
          <path d="M6 3h12v18l-2-1.25L14 21l-2-1.25L10 21l-2-1.25L6 21V3z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      )
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" />
          <circle cx="12" cy="11" r="2.25" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3l8 3v6c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V6l8-3z" />
          <path d="M9.5 12l1.8 1.8L15 10" />
        </svg>
      )
    case 'globe':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4c2.5 2.4 2.5 13.6 0 16M12 4c-2.5 2.4-2.5 13.6 0 16" />
        </svg>
      )
    case 'palette':
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 100 18h.5a2.5 2.5 0 002.5-2.5 2 2 0 012-2h1A9 9 0 0012 3z" />
          <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="7.8" r="1" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="11" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2M12 19v2M4.2 6.2l1.4 1.4M18.4 16.4l1.4 1.4M3 12h2M19 12h2M4.2 17.8l1.4-1.4M18.4 7.6l1.4-1.4" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...common}>
          <path d="M6 9a6 6 0 0112 0c0 7 2 7 2 7H4s2 0 2-7" />
          <path d="M10 19a2 2 0 004 0" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )
    case 'moon':
      return (
        <svg {...common}>
          <path d="M20 14.5A7.5 7.5 0 019.5 4 7.5 7.5 0 1019.5 15.5c.17-.33.33-.66.5-1z" />
        </svg>
      )
    case 'panel':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
        </svg>
      )
    case 'panel-left':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
          <path d="M13.5 9.5L16.5 12l-3 2.5" />
        </svg>
      )
    case 'panel-right':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
          <path d="M16.5 9.5L13.5 12l3 2.5" />
        </svg>
      )
    case 'chevron':
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      )
    case 'chevron-down':
      return (
        <svg {...common}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'x':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 11v6M14 11v6" />
          <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
          <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...common}>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 4.3L2.8 17a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z" />
        </svg>
      )
    case 'inbox':
      return (
        <svg {...common}>
          <path d="M4 13h4l2 3h4l2-3h4v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5z" />
          <path d="M4 13l2.5-7.5A2 2 0 018.4 4h7.2a2 2 0 011.9 1.5L20 13" />
        </svg>
      )
    case 'trend-up':
      return (
        <svg {...common}>
          <path d="M3 17l6-6 4 4 7-7" />
          <path d="M14 8h6v6" />
        </svg>
      )
    case 'trend-down':
      return (
        <svg {...common}>
          <path d="M3 7l6 6 4-4 7 7" />
          <path d="M14 16h6v-6" />
        </svg>
      )
    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      )
    case 'logout':
      return (
        <svg {...common}>
          <path d="M10 7V5a2 2 0 012-2h7a2 2 0 012 2v14a2 2 0 01-2 2h-7a2 2 0 01-2-2v-2" />
          <path d="M15 12H3M6 9l-3 3 3 3" />
        </svg>
      )
    case 'camera':
      return (
        <svg {...common}>
          <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}

/** Distinct icon per owner route — optimized for sidebar scannability. */
export const navIconForPath = (path) => {
  const map = {
    '/owner': 'dashboard',
    '/owner/manage-bookings': 'bookings',
    '/owner/calendar': 'calendar',
    '/owner/signature-requests': 'signature',
    '/owner/manage-cars': 'car',
    '/owner/chauffeurs': 'steering',
    '/owner/maintenance': 'wrench',
    '/owner/customers': 'user',
    '/owner/client-documents': 'folder',
    '/owner/walk-in': 'walk-in',
    '/owner/samsars': 'handshake',
    '/owner/partner-companies': 'building',
    '/owner/employees': 'id-badge',
    '/owner/accounting': 'wallet',
    '/owner/accounting/revenues': 'trend-up',
    '/owner/accounting/samsar-payments': 'coins',
    '/owner/accounting/agency-expenses': 'receipt',
    '/owner/accounting/vehicle-expenses': 'car',
    '/owner/contracts': 'file',
    '/owner/invoices': 'invoice',
    '/owner/templates': 'layout',
    '/owner/vehicle-stats': 'chart',
    '/owner/reports': 'report',
    '/owner/analytics': 'chart',
    '/owner/locations': 'pin',
    '/owner/staff': 'shield',
    '/owner/audit': 'inbox',
    '/owner/settings': 'settings',
    '/owner/settings/general': 'settings',
    '/owner/settings/branding': 'palette',
    '/owner/settings/domains': 'globe',
    '/owner/add-car': 'car',
  }
  if (map[path]) return map[path]
  if (path.includes('edit-car')) return 'car'
  if (path.includes('analytics') || path.includes('reports') || path.includes('vehicle-stats')) return 'chart'
  if (path.includes('booking') || path.includes('walk-in') || path.includes('calendar')) return 'calendar'
  if (path.includes('maintenance')) return 'wrench'
  if (path.includes('car')) return 'car'
  if (path.includes('locations')) return 'pin'
  if (path.includes('chauffeur')) return 'steering'
  if (path.includes('customer')) return 'user'
  if (path.includes('samsar')) return 'handshake'
  if (path.includes('employee')) return 'id-badge'
  if (path.includes('staff')) return 'shield'
  if (path.includes('partner')) return 'building'
  if (path.includes('signature')) return 'signature'
  if (path.includes('invoice')) return 'invoice'
  if (path.includes('contract') || path.includes('template')) return 'file'
  if (path.includes('accounting')) return 'wallet'
  if (path.includes('audit')) return 'inbox'
  if (path.includes('branding')) return 'palette'
  if (path.includes('domains')) return 'globe'
  if (path.includes('settings')) return 'settings'
  return 'dashboard'
}

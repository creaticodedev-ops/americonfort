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
    case 'car':
      return (
        <svg {...common}>
          <path d="M5 16l1.5-5.5A2 2 0 018.4 9h7.2a2 2 0 011.9 1.5L19 16" />
          <path d="M5 16h14v2a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z" />
          <circle cx="7.5" cy="16" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="16" r="1.2" fill="currentColor" stroke="none" />
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
    case 'building':
      return (
        <svg {...common}>
          <path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M4 21h16M10 21v-4h4v4M8 8h.01M12 8h.01M8 12h.01M12 12h.01" />
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
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 16V10M12 16V7M16 16v-4" />
        </svg>
      )
    case 'wallet':
      return (
        <svg {...common}>
          <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          <path d="M3 10h18M16 14h.01" />
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
    case 'chevron':
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
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
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}

export const navIconForPath = (path) => {
  if (path === '/owner') return 'dashboard'
  if (path.includes('analytics') || path.includes('reports') || path.includes('vehicle-stats')) return 'chart'
  if (path.includes('booking') || path.includes('walk-in') || path.includes('calendar')) return 'calendar'
  if (path.includes('car') || path.includes('maintenance') || path.includes('locations')) return 'car'
  if (path.includes('chauffeur') || path.includes('customer') || path.includes('samsar') || path.includes('employee')) return 'users'
  if (path.includes('partner')) return 'building'
  if (path.includes('signature')) return 'signature'
  if (path.includes('contract') || path.includes('invoice') || path.includes('template')) return 'file'
  if (path.includes('accounting')) return 'wallet'
  if (path.includes('audit')) return 'inbox'
  if (path.includes('settings')) return 'settings'
  return 'dashboard'
}

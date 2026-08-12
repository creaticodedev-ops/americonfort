import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import brandLogo from '../../assets/logo.webp'
import { useAppContext } from '../../context/AppContext'
import { BRAND_NAME } from '../../constants/brand'
import { useI18n } from '../../i18n/I18nContext'
import { useAdminTheme } from '../../context/AdminThemeContext'
import LanguageSwitcher from '../LanguageSwitcher'
import NotificationBell from './NotificationBell'
import GlobalSearch from './GlobalSearch'
import { Icon } from './ui/adminIcons'
import { getOwnerPageMeta } from './ownerNavConfig'
import { useLocation } from 'react-router-dom'

const NavbarOwner = ({ onOpenNav, navOpen = false, onToggleCollapsed }) => {
  const { user, logout, license, licenseLocked } = useAppContext()
  const { t } = useI18n()
  const { pathname } = useLocation()
  const { resolved, toggle, preference, setTheme } = useAdminTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const pageMeta = useMemo(() => getOwnerPageMeta(pathname, t), [pathname, t])

  const showTrialBadge =
    !licenseLocked &&
    license?.licenseStatus === 'trial' &&
    typeof license?.daysRemaining === 'number'

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDoc = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <header className="admin-topbar">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {!licenseLocked && typeof onOpenNav === 'function' && (
          <button
            type="button"
            onClick={onOpenNav}
            className="md:hidden admin-icon-btn shrink-0"
            aria-label={t('admin.shell.openMenu')}
            aria-expanded={navOpen}
          >
            <Icon name="menu" className="h-4 w-4" />
          </button>
        )}
        {!licenseLocked && typeof onToggleCollapsed === 'function' && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden md:inline-flex admin-icon-btn shrink-0"
            aria-label="Toggle sidebar"
          >
            <Icon name="panel" className="h-4 w-4" />
          </button>
        )}
        <Link to="/" className="shrink-0 hidden sm:block" title={BRAND_NAME}>
          <img
            src={brandLogo}
            alt={BRAND_NAME}
            width={160}
            height={76}
            decoding="async"
            className="block h-7 w-auto max-h-7 object-contain"
          />
        </Link>
        {!licenseLocked && (
          <div className="min-w-0 hidden lg:block border-l border-[var(--admin-border)] pl-3 ml-1">
            <p className="text-sm font-semibold text-[var(--admin-fg)] truncate leading-tight">
              {pageMeta.title}
            </p>
          </div>
        )}
      </div>

      {!licenseLocked && (
        <div className="hidden md:flex min-w-0 flex-1 justify-center px-2 lg:px-6">
          <GlobalSearch />
        </div>
      )}

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
        {showTrialBadge && (
          <span className="hidden sm:inline-flex text-[11px] px-2.5 py-1 rounded-md bg-[var(--admin-warning-soft)] text-[var(--admin-warning)] border border-[color-mix(in_srgb,var(--admin-warning)_22%,transparent)] whitespace-nowrap">
            {license.daysRemaining === 1
              ? t('admin.trial.daysLeft', { count: 1 })
              : t('admin.trial.daysLeft_plural', { count: license.daysRemaining })}
          </span>
        )}

        <button
          type="button"
          className="admin-icon-btn"
          onClick={toggle}
          aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={resolved === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <Icon name={resolved === 'dark' ? 'sun' : 'moon'} className="h-4 w-4" />
        </button>

        {!licenseLocked && <NotificationBell />}
        <LanguageSwitcher />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] pl-1 pr-2 py-1 hover:bg-[var(--admin-surface-hover)] cursor-pointer"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <img
              src={user?.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300'}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
            <span className="hidden xl:block text-xs font-medium text-[var(--admin-fg)] max-w-[7rem] truncate">
              {user?.name || 'Admin'}
            </span>
            <Icon name="chevron" className="h-3.5 w-3.5 text-[var(--admin-fg-muted)] hidden sm:block" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)] py-1 z-50"
            >
              <div className="px-3 py-2 border-b border-[var(--admin-border)]">
                <p className="text-sm font-semibold truncate">{user?.name || 'Admin'}</p>
                <p className="text-[11px] text-[var(--admin-fg-muted)] truncate">{user?.email}</p>
              </div>
              <div className="px-2 py-2 border-b border-[var(--admin-border)]">
                <p className="px-1 pb-1 text-[10px] uppercase tracking-wider text-[var(--admin-fg-muted)]">Theme</p>
                <div className="flex gap-1">
                  {[
                    ['light', 'Light'],
                    ['dark', 'Dark'],
                    ['system', 'System'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={preference === id}
                      className={`flex-1 h-8 rounded-md text-[11px] font-medium cursor-pointer ${
                        preference === id
                          ? 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]'
                          : 'text-[var(--admin-fg-secondary)] hover:bg-[var(--admin-surface-hover)]'
                      }`}
                      onClick={() => setTheme(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Link
                to="/owner/settings"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--admin-fg-secondary)] hover:bg-[var(--admin-surface-hover)]"
                onClick={() => setMenuOpen(false)}
              >
                <Icon name="settings" className="h-4 w-4" />
                {t('admin.menu.settings')}
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft)] cursor-pointer"
              >
                <Icon name="logout" className="h-4 w-4" />
                {t('admin.shell.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default NavbarOwner

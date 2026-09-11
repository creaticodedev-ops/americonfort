import React, { useMemo, useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import brandLogo from '../../assets/logo.webp'
import { useAppContext } from '../../context/AppContext'
import { BRAND_NAME } from '../../constants/brand'
import { useI18n } from '../../i18n/I18nContext'
import { useAdminTheme } from '../../context/AdminThemeContext'
import LanguageSwitcher from '../LanguageSwitcher'
import NotificationBell from './NotificationBell'
import GlobalSearch from './GlobalSearch'
import AdminQuickActions from './AdminQuickActions'
import { Icon } from './ui/adminIcons'
import { getOwnerPageMeta } from './ownerNavConfig'

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
      <div className="admin-topbar__start">
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
            aria-label={t('admin.commonUi.toggleSidebar')}
          >
            <Icon name="panel" className="h-4 w-4" />
          </button>
        )}
        <Link to="/" className="admin-topbar__logo" title={BRAND_NAME}>
          <img
            src={brandLogo}
            alt={BRAND_NAME}
            width={160}
            height={76}
            decoding="async"
          />
        </Link>
        {!licenseLocked && (
          <div className="admin-topbar__page">
            <p className="admin-topbar__page-title truncate">{pageMeta.title}</p>
          </div>
        )}
      </div>

      {!licenseLocked && (
        <div className="admin-topbar__search">
          <GlobalSearch />
        </div>
      )}

      <div className="admin-topbar__end">
        {showTrialBadge && (
          <span className="admin-topbar__trial">
            {license.daysRemaining === 1
              ? t('admin.trial.daysLeft', { count: 1 })
              : t('admin.trial.daysLeft_plural', { count: license.daysRemaining })}
          </span>
        )}

        <button
          type="button"
          className="admin-icon-btn"
          onClick={toggle}
          aria-label={resolved === 'dark' ? t('admin.leftover.switchLight') : t('admin.leftover.switchDark')}
          title={resolved === 'dark' ? t('admin.leftover.lightMode') : t('admin.leftover.darkMode')}
        >
          <Icon name={resolved === 'dark' ? 'sun' : 'moon'} className="h-4 w-4" />
        </button>

        {!licenseLocked && <AdminQuickActions />}
        {!licenseLocked && <NotificationBell />}
        <LanguageSwitcher />

        <div className="admin-topbar__divider" aria-hidden="true" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className={`admin-topbar-user ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <img
              src={user?.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300'}
              alt=""
              className="admin-topbar-user__avatar"
            />
            <span className="admin-topbar-user__meta">
              <span className="admin-topbar-user__name truncate">
                {user?.name || 'Admin'}
              </span>
            </span>
            <Icon name="chevron-down" className="admin-topbar-user__chevron h-3.5 w-3.5" />
          </button>

          {menuOpen && (
            <div role="menu" className="admin-topbar-menu">
              <div className="admin-topbar-menu__head">
                <p className="admin-topbar-menu__name truncate">{user?.name || 'Admin'}</p>
                <p className="admin-topbar-menu__email truncate">{user?.email}</p>
              </div>
              <div className="admin-topbar-menu__theme">
                <p className="admin-topbar-menu__theme-label">{t('admin.leftover.theme')}</p>
                <div className="admin-topbar-menu__theme-row">
                  {[
                    ['light', t('admin.leftover.themeLight')],
                    ['dark', t('admin.leftover.themeDark')],
                    ['system', t('admin.leftover.themeSystem')],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={preference === id}
                      className={`admin-topbar-menu__theme-btn ${preference === id ? 'is-active' : ''}`}
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
                className="admin-topbar-menu__item"
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
                className="admin-topbar-menu__item is-danger"
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

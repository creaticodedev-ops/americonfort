import React, { useEffect, useState, useCallback } from 'react'
import NavbarOwner from '../../components/owner/NavbarOwner'
import Sidebar from '../../components/owner/Sidebar'
import TrialExpired from '../../components/owner/TrialExpired'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { AdminThemeProvider, useAdminTheme } from '../../context/AdminThemeContext'
import { OWNER_SIDEBAR_COLLAPSED_KEY } from '../../components/owner/ownerNavConfig'

const readCollapsed = () => {
  try {
    return localStorage.getItem(OWNER_SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

const AdminShell = () => {
  const { isOwner, navigate, authReady, setShowLogin, licenseLocked } = useAppContext()
  const { t, dir, isRtl } = useI18n()
  const { resolved } = useAdminTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(OWNER_SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (authReady && !isOwner) {
      sessionStorage.setItem('ownerReturnTo', window.location.pathname)
      setShowLogin(true)
      navigate('/')
    }
  }, [isOwner, authReady, navigate, setShowLogin])

  if (!authReady) {
    return (
      <div
        className="admin-app min-h-svh flex items-center justify-center text-[var(--admin-fg-muted)] px-4"
        data-theme={resolved}
        data-rtl={isRtl ? 'true' : 'false'}
        dir={dir}
      >
        {t('admin.shell.loading')}
      </div>
    )
  }

  if (!isOwner) return null

  if (licenseLocked) {
    return (
      <div className="admin-app admin-shell" data-theme={resolved} data-rtl={isRtl ? 'true' : 'false'} dir={dir}>
        <NavbarOwner />
        <TrialExpired />
      </div>
    )
  }

  return (
    <div className="admin-app admin-shell" data-theme={resolved} data-rtl={isRtl ? 'true' : 'false'} dir={dir}>
      <NavbarOwner
        onOpenNav={() => setMobileNavOpen(true)}
        navOpen={mobileNavOpen}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="admin-shell-body">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
        <main className="admin-main admin-page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const Layout = () => (
  <AdminThemeProvider>
    <AdminShell />
  </AdminThemeProvider>
)

export default Layout

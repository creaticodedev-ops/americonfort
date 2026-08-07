import React, { useEffect, useState } from 'react'
import NavbarOwner from '../../components/owner/NavbarOwner'
import Sidebar from '../../components/owner/Sidebar'
import TrialExpired from '../../components/owner/TrialExpired'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'

const Layout = () => {
  const { isOwner, navigate, authReady, setShowLogin, licenseLocked } = useAppContext()
  const { t } = useI18n()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (authReady && !isOwner) {
      sessionStorage.setItem('ownerReturnTo', window.location.pathname)
      setShowLogin(true)
      navigate('/')
    }
  }, [isOwner, authReady, navigate, setShowLogin])

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 px-4">
        {t('admin.shell.loading')}
      </div>
    )
  }

  if (!isOwner) return null

  if (licenseLocked) {
    return (
      <div className="flex flex-col min-h-svh bg-light">
        <NavbarOwner />
        <TrialExpired />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-svh bg-light">
      <NavbarOwner
        onOpenNav={() => setMobileNavOpen(true)}
        navOpen={mobileNavOpen}
      />
      <div className="flex flex-1 min-w-0">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <main className="flex-1 min-w-0 admin-page pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout

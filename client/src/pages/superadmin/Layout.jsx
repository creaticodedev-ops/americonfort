import React, { useEffect } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useSuperAdmin } from '../../context/SuperAdminContext'
import { BRAND_NAME } from '../../constants/brand'

const links = [
  { to: '/superadmin', end: true, label: 'Overview' },
  { to: '/superadmin/admins', label: 'Admins' },
  { to: '/superadmin/activity', label: 'Activity' },
  { to: '/superadmin/audit', label: 'Audit logs' },
]

const SuperAdminLayout = () => {
  const { authReady, isSuperAdmin, user, logout, navigate } = useSuperAdmin()

  useEffect(() => {
    if (authReady && !isSuperAdmin) {
      navigate('/superadmin/login', { replace: true })
    }
  }, [authReady, isSuperAdmin, navigate])

  if (!authReady) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#0c1219] text-slate-400 text-sm">
        Loading…
      </div>
    )
  }

  if (!isSuperAdmin) {
    return <Navigate to="/superadmin/login" replace />
  }

  return (
    <div className="min-h-svh flex flex-col bg-[#0c1219] text-slate-100">
      <header className="border-b border-white/10 bg-[#0a0f14]/90 backdrop-blur sticky top-0 z-20">
        <div className="page-pad py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="min-w-0">
              <p className="font-display text-2xl leading-none text-white">{BRAND_NAME}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-500/90 mt-0.5">Super Admin</p>
            </div>
            <nav className="hidden sm:flex items-center gap-1 ml-2">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 text-sm transition-colors ${
                      isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400 truncate max-w-[10rem] sm:max-w-xs">{user?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="sm:hidden flex gap-1 page-pad pb-2 overflow-x-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                  isActive ? 'text-white bg-white/10' : 'text-slate-400'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 page-pad py-6 sm:py-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default SuperAdminLayout

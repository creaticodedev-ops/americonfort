import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'
import { BRAND_NAME } from '../../constants/brand'

const SuperAdminLogin = () => {
  const { login, isSuperAdmin, authReady } = useSuperAdmin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (authReady && isSuperAdmin) {
    return <Navigate to="/superadmin" replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email.trim(), password)
      toast.success('Welcome, Super Admin')
    } catch (error) {
      toast.error(saError(error, 'Invalid credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-svh flex flex-col bg-[#0c1219] text-slate-100 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(14,116,144,0.45), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(15,118,110,0.25), transparent 50%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <header className="relative z-10 page-pad py-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Public site
        </Link>
        <span className="text-[11px] uppercase tracking-[0.2em] text-cyan-500/80">Restricted access</span>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center page-pad pb-16">
        <div className="w-full max-w-md">
          <p className="font-display text-4xl sm:text-5xl text-white mb-2">{BRAND_NAME}</p>
          <h1 className="text-lg sm:text-xl text-slate-300 font-medium mb-1">Super Admin</h1>
          <p className="text-sm text-slate-500 mb-8 max-w-sm">
            Platform control for licenses, admin accounts, and system activity. Agency admins cannot access this area.
          </p>

          <form
            onSubmit={onSubmit}
            className="space-y-4 border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8"
          >
            <div>
              <label htmlFor="sa-email" className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Email
              </label>
              <input
                id="sa-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-600/60"
              />
            </div>
            <div>
              <label htmlFor="sa-password" className="block text-xs uppercase tracking-wider text-slate-400 mb-2">
                Password
              </label>
              <input
                id="sa-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-600/60"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !authReady}
              className="w-full mt-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-white text-sm font-medium py-3 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default SuperAdminLogin

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'

const Stat = ({ label, value, hint }) => (
  <div className="border border-white/10 bg-white/[0.03] p-4 sm:p-5">
    <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-2 text-2xl sm:text-3xl font-medium text-white tabular-nums">{value ?? '—'}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
)

const statusTone = (status) => {
  if (status === 'active') return 'text-emerald-400'
  if (status === 'trial') return 'text-cyan-400'
  if (status === 'expired') return 'text-amber-400'
  if (status === 'suspended' || status === 'disabled') return 'text-rose-400'
  return 'text-slate-400'
}

const SuperAdminDashboard = () => {
  const { axios } = useSuperAdmin()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: res } = await axios.get('/api/super-admin/overview')
        if (!cancelled && res.success) setData(res)
      } catch (error) {
        toast.error(saError(error, 'Failed to load overview'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [axios])

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading platform overview…</p>
  }

  const o = data?.overview || {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-white">Platform overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage every agency, license, and audit trail from one place.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Agencies" value={o.totalAdmins} />
        <Stat label="Active accounts" value={o.activeAdmins} />
        <Stat label="On trial" value={o.trialAdmins} hint={`${o.licensedAdmins || 0} licensed`} />
        <Stat label="Expired / locked" value={(o.expiredAdmins || 0) + (o.suspendedAdmins || 0)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Fleet vehicles" value={o.totalCars} />
        <Stat label="Bookings" value={o.totalBookings} />
        <Stat label="Customers" value={o.totalCustomers} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/superadmin/agencies"
          className="bg-cyan-700 hover:bg-cyan-600 text-white text-sm px-4 py-2.5 transition-colors"
        >
          Manage agencies
        </Link>
        <Link
          to="/superadmin/agencies?create=1"
          className="border border-white/15 hover:border-white/30 text-sm px-4 py-2.5 text-slate-200 transition-colors"
        >
          Create agency
        </Link>
        <Link
          to="/superadmin/audit"
          className="border border-white/15 hover:border-white/30 text-sm px-4 py-2.5 text-slate-200 transition-colors"
        >
          View audit logs
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wider text-slate-400">Recent agencies</h2>
          <Link to="/superadmin/agencies" className="text-xs text-cyan-500 hover:text-cyan-400">
            View all
          </Link>
        </div>
        <div className="border border-white/10 overflow-x-auto table-scroll">
          <table className="w-full text-sm text-left min-w-[640px]">
            <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Agency</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">License</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(data?.recentAdmins || []).map((admin) => (
                <tr key={admin._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="text-white">{admin.name}</p>
                    <p className="text-xs text-slate-500">{admin.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{admin.agencyName || '—'}</td>
                  <td className={`px-4 py-3 capitalize ${statusTone(admin.accountStatus)}`}>
                    {admin.accountStatus || 'active'}
                  </td>
                  <td className={`px-4 py-3 capitalize ${statusTone(admin.license?.licenseStatus || admin.licenseStatus)}`}>
                    {admin.license?.licenseStatus || admin.licenseStatus}
                    {admin.license?.daysRemaining != null && admin.license?.licenseStatus === 'trial' && (
                      <span className="text-slate-500"> · {admin.license.daysRemaining}d</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/superadmin/agencies/${admin._id}`} className="text-cyan-500 hover:text-cyan-400 text-xs">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {!data?.recentAdmins?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No agencies yet. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default SuperAdminDashboard

import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'

const emptyForm = {
  name: '',
  contactName: '',
  email: '',
  password: '',
  status: 'trial',
  notes: '',
  profile: {
    legalName: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    country: 'Morocco',
    logo: '',
    primaryDomain: '',
  },
}

const STATUS_META = {
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  trial: { label: 'Trial', className: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30' },
  pending: { label: 'Pending', className: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  suspended: { label: 'Suspended', className: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
}

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.className}`}>
      {meta.label}
    </span>
  )
}

const formatDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

const SuperAdminAgencies = () => {
  const { axios } = useSuperAdmin()
  const [searchParams, setSearchParams] = useSearchParams()
  const [agencies, setAgencies] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [counts, setCounts] = useState({ all: 0, active: 0, trial: 0, pending: 0, suspended: 0 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === '1')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await axios.get('/api/super-admin/agencies', {
        params: { search: debouncedSearch, status, page, limit: 20 },
      })
      if (data.success) {
        setAgencies(data.agencies || [])
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 })
        setCounts(data.counts || {})
      } else {
        setError(data.message || 'Could not load agencies')
      }
    } catch (err) {
      setError(saError(err))
    } finally {
      setLoading(false)
    }
  }, [axios, debouncedSearch, status])

  useEffect(() => {
    load(1)
  }, [load])

  useEffect(() => {
    if (searchParams.get('create') === '1') setShowCreate(true)
  }, [searchParams])

  const setStatusFilter = (next) => {
    setStatus(next)
    const params = new URLSearchParams(searchParams)
    if (next) params.set('status', next)
    else params.delete('status')
    setSearchParams(params, { replace: true })
  }

  const createAgency = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await axios.post('/api/super-admin/agencies', form)
      if (!data.success) throw new Error(data.message)
      toast.success('Agency created')
      setForm(emptyForm)
      setShowCreate(false)
      setSearchParams({})
      load(1)
    } catch (err) {
      toast.error(saError(err))
    } finally {
      setSaving(false)
    }
  }

  const filterChips = [
    { id: '', label: 'All', count: counts.all },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'trial', label: 'Trial', count: counts.trial },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'suspended', label: 'Suspended', count: counts.suspended },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-white">Agencies</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage every rental agency on the platform. Suspension preserves all data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-sm px-4 py-2.5 transition-colors"
        >
          {showCreate ? 'Close form' : 'Create agency'}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={createAgency}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 grid sm:grid-cols-2 gap-4"
        >
          <h2 className="sm:col-span-2 text-sm uppercase tracking-wider text-slate-400">New agency</h2>
          {[
            ['name', 'Agency name', 'text', true],
            ['contactName', 'Contact name', 'text', true],
            ['email', 'Login email', 'email', true],
            ['password', 'Temporary password', 'password', true],
          ].map(([key, label, type, required]) => (
            <div key={key}>
              <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
              <input
                required={required}
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Initial status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Phone</label>
            <input
              value={form.profile.phone}
              onChange={(e) => setForm((f) => ({ ...f, profile: { ...f.profile, phone: e.target.value } }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">WhatsApp</label>
            <input
              value={form.profile.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, profile: { ...f.profile, whatsapp: e.target.value } }))}
              placeholder="2126…"
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">City</label>
            <input
              value={form.profile.city}
              onChange={(e) => setForm((f) => ({ ...f, profile: { ...f.profile, city: e.target.value } }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1.5">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-white text-sm px-4 py-2.5"
            >
              {saving ? 'Creating…' : 'Create agency'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.id || 'all'}
              type="button"
              onClick={() => setStatusFilter(chip.id)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ring-1 ring-inset ${
                status === chip.id
                  ? 'bg-white/10 text-white ring-white/20'
                  : 'text-slate-400 ring-white/10 hover:text-white'
              }`}
            >
              {chip.label}
              <span className="ml-1.5 text-slate-500">{chip.count ?? 0}</span>
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agency, email, city…"
          className="w-full lg:w-80 rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
        />
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
        {loading ? (
          <p className="p-8 text-sm text-slate-500">Loading agencies…</p>
        ) : error ? (
          <div className="p-8 space-y-3">
            <p className="text-sm text-rose-300">{error}</p>
            <button type="button" onClick={() => load(pagination.page || 1)} className="text-sm text-cyan-400 hover:text-cyan-300">
              Retry
            </button>
          </div>
        ) : agencies.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-white font-medium">No agencies found</p>
            <p className="mt-1 text-sm text-slate-500">
              {debouncedSearch || status
                ? 'Try adjusting search or filters.'
                : 'Create the first agency to get started.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Agency</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Location</th>
                    <th className="px-4 py-3 font-medium hidden lg:table-cell">Usage</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Created</th>
                    <th className="px-4 py-3 font-medium text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {agencies.map((agency) => (
                    <tr key={agency.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-white/5 ring-1 ring-white/10 overflow-hidden shrink-0 flex items-center justify-center text-xs text-slate-400">
                            {agency.profile?.logo || agency.image ? (
                              <img src={agency.profile?.logo || agency.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (agency.name || '?').slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{agency.name || 'Untitled agency'}</p>
                            <p className="text-xs text-slate-500 truncate">{agency.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={agency.status} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 hidden md:table-cell">
                        {[agency.profile?.city, agency.profile?.country].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 hidden lg:table-cell whitespace-nowrap">
                        {agency.stats?.vehicles ?? 0} cars · {agency.stats?.reservations ?? 0} bookings
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 hidden sm:table-cell">
                        {formatDate(agency.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/superadmin/agencies/${agency.id}`}
                          className="text-cyan-400 hover:text-cyan-300 text-sm"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-white/5 text-xs text-slate-500">
              <span>
                {pagination.total} agencies · page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => load(pagination.page - 1)}
                  className="px-3 py-1.5 rounded-md border border-white/10 disabled:opacity-40 hover:bg-white/5"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => load(pagination.page + 1)}
                  className="px-3 py-1.5 rounded-md border border-white/10 disabled:opacity-40 hover:bg-white/5"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SuperAdminAgencies

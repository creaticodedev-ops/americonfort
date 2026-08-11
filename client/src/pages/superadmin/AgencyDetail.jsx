import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'

const STATUS_META = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  trial: {
    label: 'Trial',
    className: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/30',
    dot: 'bg-cyan-400',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    dot: 'bg-amber-400',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    dot: 'bg-rose-400',
  },
}

const ACCOUNT_META = {
  active: { label: 'Active', className: 'text-emerald-300' },
  pending: { label: 'Pending', className: 'text-amber-300' },
  suspended: { label: 'Suspended', className: 'text-rose-300' },
  disabled: { label: 'Disabled', className: 'text-rose-300' },
}

const LICENSE_META = {
  active: { label: 'Licensed', className: 'text-emerald-300' },
  trial: { label: 'Trial', className: 'text-cyan-300' },
  expired: { label: 'Expired', className: 'text-rose-300' },
}

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

const formatDate = (value, withTime = true) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return withTime
    ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

const displayValue = (value) => {
  if (value === 0) return '0'
  if (value == null || value === '') return '—'
  return value
}

const ConfirmDialog = ({ open, title, body, confirmLabel, danger, busy, onConfirm, onCancel }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0f1620] p-5 shadow-2xl">
        <h3 className="text-lg text-white font-medium">{title}</h3>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">{body}</p>
        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2.5 text-sm text-white disabled:opacity-60 ${
              danger ? 'bg-rose-700 hover:bg-rose-600' : 'bg-cyan-700 hover:bg-cyan-600'
            }`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const MetricCard = ({ label, value, hint }) => (
  <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-4">
    <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-2 text-2xl text-white font-medium tabular-nums">{displayValue(value)}</p>
    {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
  </div>
)

const InfoRow = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5 border-b border-white/5 last:border-0">
    <dt className="sm:w-36 shrink-0 text-xs uppercase tracking-wider text-slate-500 pt-0.5">{label}</dt>
    <dd className="text-sm text-slate-200 min-w-0 break-words">{children}</dd>
  </div>
)

const SuperAdminAgencyDetail = () => {
  const { id } = useParams()
  const { axios, navigate } = useSuperAdmin()
  const [agency, setAgency] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [plans, setPlans] = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [edit, setEdit] = useState({
    name: '',
    contactName: '',
    email: '',
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
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [agencyRes, plansRes] = await Promise.all([
        axios.get(`/api/super-admin/agencies/${id}`),
        axios.get('/api/super-admin/plans', { params: { active: 'true' } }),
      ])
      if (!agencyRes.data.success) throw new Error(agencyRes.data.message)
      setAgency(agencyRes.data.agency)
      setSelectedPlanId(agencyRes.data.agency.plan?.planId || '')
      if (plansRes.data.success) setPlans(plansRes.data.plans || [])
      setEdit({
        name: agencyRes.data.agency.name || '',
        contactName: agencyRes.data.agency.contactName || '',
        email: agencyRes.data.agency.email || '',
        notes: agencyRes.data.agency.notes || '',
        profile: {
          legalName: agencyRes.data.agency.profile?.legalName || '',
          phone: agencyRes.data.agency.profile?.phone || '',
          whatsapp: agencyRes.data.agency.profile?.whatsapp || '',
          address: agencyRes.data.agency.profile?.address || '',
          city: agencyRes.data.agency.profile?.city || '',
          country: agencyRes.data.agency.profile?.country || 'Morocco',
          logo: agencyRes.data.agency.profile?.logo || '',
          primaryDomain: agencyRes.data.agency.profile?.primaryDomain || '',
        },
      })
    } catch (error) {
      toast.error(saError(error))
      navigate('/superadmin/agencies')
    } finally {
      setLoading(false)
    }
  }, [axios, id, navigate])

  useEffect(() => {
    load()
  }, [load])

  const run = async (key, fn) => {
    setBusy(key)
    try {
      await fn()
      await load()
    } catch (error) {
      toast.error(saError(error))
    } finally {
      setBusy('')
    }
  }

  const requestStatus = (status) => {
    if (status === 'suspended') {
      setConfirm({
        status,
        title: 'Suspend this agency?',
        body: 'The agency owner will lose dashboard access immediately. Vehicles, reservations, contracts, and payments are not deleted.',
        confirmLabel: 'Suspend agency',
        danger: true,
      })
      return
    }
    if (status === 'pending') {
      setConfirm({
        status,
        title: 'Mark agency as pending?',
        body: 'Owner login will be blocked until the agency is activated again. Existing fleet and reservations are preserved.',
        confirmLabel: 'Set pending',
        danger: true,
      })
      return
    }
    applyStatus(status)
  }

  const applyStatus = (status) =>
    run(`status-${status}`, async () => {
      const { data } = await axios.patch(`/api/super-admin/agencies/${id}/status`, { status })
      if (!data.success) throw new Error(data.message)
      toast.success(data.message || `Status set to ${status}`)
      setConfirm(null)
    })

  if (loading || !agency) {
    return <p className="text-slate-500 text-sm">Loading agency overview…</p>
  }

  const stats = agency.stats || {}
  const health = agency.health || { ok: true, issues: [] }
  const plan = agency.plan || {}
  const accountMeta = ACCOUNT_META[agency.accountStatus] || ACCOUNT_META.active
  const licenseMeta = LICENSE_META[agency.licenseStatus] || LICENSE_META.trial
  const domain = agency.profile?.primaryDomain?.trim() || ''
  const formatLimit = (n) => {
    const v = Number(n) || 0
    return v <= 0 ? 'Unlimited' : String(v)
  }
  const metrics = [
    { label: 'Fleet', value: stats.fleetCount ?? stats.vehicles ?? 0, hint: 'Total vehicles' },
    { label: 'Bookable', value: stats.bookableVehicles ?? 0, hint: 'Website-ready units' },
    { label: 'Reservations', value: stats.reservationsTotal ?? stats.reservations ?? 0, hint: 'All time' },
    { label: 'Pending', value: stats.reservationsPending ?? 0, hint: 'Awaiting confirmation' },
    { label: 'Active', value: stats.reservationsActive ?? 0, hint: 'Currently on rent' },
    { label: 'Completed', value: stats.reservationsCompleted ?? 0, hint: 'Finished rentals' },
    { label: 'Staff', value: stats.staffCount ?? stats.users ?? 1, hint: 'Owner accounts' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_top_left,_rgba(34,211,238,0.08),_transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link to="/superadmin/agencies" className="text-xs text-slate-500 hover:text-cyan-400">
              ← All agencies
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl sm:text-4xl text-white truncate">
                {agency.name || 'Untitled agency'}
              </h1>
              <StatusBadge status={agency.status} />
            </div>
            <p className="text-sm text-slate-400 mt-1.5">
              Agency overview · Created {formatDate(agency.createdAt, false)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {agency.status === 'suspended' || agency.status === 'pending' ? (
              <button
                type="button"
                disabled={busy.startsWith('status-')}
                onClick={() => requestStatus('active')}
                className="rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-sm px-3.5 py-2 text-white"
              >
                Activate
              </button>
            ) : null}
            {agency.status !== 'suspended' ? (
              <button
                type="button"
                disabled={busy.startsWith('status-')}
                onClick={() => requestStatus('suspended')}
                className="rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-60 text-sm px-3.5 py-2"
              >
                Suspend
              </button>
            ) : null}
          </div>
        </div>

        <dl className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">Account</dt>
            <dd className={`mt-1 font-medium ${accountMeta.className}`}>{accountMeta.label}</dd>
          </div>
          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">License</dt>
            <dd className={`mt-1 font-medium ${licenseMeta.className}`}>
              {licenseMeta.label}
              {agency.license?.licenseStatus === 'trial' && agency.license?.daysRemaining != null
                ? ` · ${agency.license.daysRemaining}d left`
                : ''}
            </dd>
          </div>
          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">Website / domain</dt>
            <dd className="mt-1 text-slate-200 truncate">
              {domain ? (
                <a
                  href={domain.startsWith('http') ? domain : `https://${domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  {domain}
                </a>
              ) : (
                <span className="text-slate-500">Not set</span>
              )}
            </dd>
          </div>
          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">Last activity</dt>
            <dd className="mt-1 text-slate-200">
              {formatDate(agency.lastActivityAt || agency.lastLoginAt)}
              {agency.lastActivity?.label ? (
                <span className="block text-xs text-slate-500 mt-0.5 truncate">{agency.lastActivity.label}</span>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>

      {/* Health */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm uppercase tracking-wider text-slate-400">Agency health</h2>
          {health.ok ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              No actionable issues
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {health.issueCount || health.issues.length} issue{(health.issueCount || health.issues.length) === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {health.ok ? (
          <p className="mt-3 text-sm text-slate-500">
            Account, license, and fleet signals look healthy for this agency.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {health.issues.map((issue) => (
              <li
                key={issue.code}
                className={`flex gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  issue.severity === 'critical'
                    ? 'border-rose-500/25 bg-rose-500/10 text-rose-100'
                    : 'border-amber-500/25 bg-amber-500/10 text-amber-100'
                }`}
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    issue.severity === 'critical' ? 'bg-rose-400' : 'bg-amber-400'
                  }`}
                />
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Metrics */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Live metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {metrics.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Contact & identity */}
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-2">Contact & identity</h2>
          <dl>
            <InfoRow label="Contact">{displayValue(agency.contactName)}</InfoRow>
            <InfoRow label="Email">
              {agency.email ? (
                <a href={`mailto:${agency.email}`} className="text-cyan-400 hover:text-cyan-300">
                  {agency.email}
                </a>
              ) : (
                '—'
              )}
            </InfoRow>
            <InfoRow label="Phone">{displayValue(agency.profile?.phone)}</InfoRow>
            <InfoRow label="WhatsApp">{displayValue(agency.profile?.whatsapp)}</InfoRow>
            <InfoRow label="Address">
              {[agency.profile?.address, agency.profile?.city, agency.profile?.country]
                .filter(Boolean)
                .join(', ') || '—'}
            </InfoRow>
            <InfoRow label="Legal name">{displayValue(agency.profile?.legalName)}</InfoRow>
          </dl>
        </section>

        {/* Account timeline */}
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-2">Account & license</h2>
          <dl>
            <InfoRow label="Agency status">
              <StatusBadge status={agency.status} />
            </InfoRow>
            <InfoRow label="Account status">
              <span className={accountMeta.className}>{accountMeta.label}</span>
            </InfoRow>
            <InfoRow label="License status">
              <span className={licenseMeta.className}>{licenseMeta.label}</span>
            </InfoRow>
            <InfoRow label="Trial ends">{formatDate(agency.license?.trialEndsAt)}</InfoRow>
            <InfoRow label="Licensed at">{formatDate(agency.license?.licensedAt)}</InfoRow>
            <InfoRow label="Created">{formatDate(agency.createdAt)}</InfoRow>
            <InfoRow label="Last login">{formatDate(agency.lastLoginAt)}</InfoRow>
            <InfoRow label="Updated">{formatDate(agency.updatedAt)}</InfoRow>
          </dl>
        </section>
      </div>

      {/* Plan & entitlements */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm uppercase tracking-wider text-slate-400">Plan & entitlements</h2>
          <Link to="/superadmin/plans" className="text-xs text-cyan-400 hover:text-cyan-300">
            Manage plans →
          </Link>
        </div>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">Current plan</dt>
            <dd className="mt-1 text-slate-100">{plan.name || 'Not assigned'}</dd>
            {plan.code ? <dd className="text-[11px] text-slate-500 font-mono">{plan.code}</dd> : null}
          </div>
          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">Plan status</dt>
            <dd className="mt-1 text-slate-100 capitalize">{plan.status || '—'}</dd>
          </div>
          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">Trial</dt>
            <dd className="mt-1 text-slate-100">
              {agency.license?.licenseStatus === 'trial'
                ? `${agency.license?.daysRemaining ?? '—'} day(s) left`
                : agency.license?.licenseStatus === 'active'
                  ? 'Licensed (no trial)'
                  : agency.license?.licenseStatus || '—'}
            </dd>
          </div>
          <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500">Assigned</dt>
            <dd className="mt-1 text-slate-100">{formatDate(plan.assignedAt)}</dd>
          </div>
        </dl>

        <div className="grid sm:grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border border-white/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Max vehicles</p>
            <p className="text-slate-200 mt-0.5">{formatLimit(plan.limits?.maxVehicles)}</p>
          </div>
          <div className="rounded-lg border border-white/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Max users</p>
            <p className="text-slate-200 mt-0.5">{formatLimit(plan.limits?.maxUsers)}</p>
          </div>
          <div className="rounded-lg border border-white/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Max reservations</p>
            <p className="text-slate-200 mt-0.5">{formatLimit(plan.limits?.maxReservations)}</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Feature entitlements</p>
          <div className="flex flex-wrap gap-1.5">
            {(plan.features || []).length ? (
              plan.features.map((key) => (
                <span
                  key={key}
                  className="text-[11px] rounded-md px-2 py-1 bg-emerald-500/10 text-emerald-200 border border-emerald-500/20"
                >
                  {key}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No features listed</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 pt-1">
          <div className="min-w-[14rem] flex-1">
            <label className="block text-xs text-slate-500 mb-1">Assign plan</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            >
              <option value="">Select a plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}){p.isDefault ? ' — default' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!selectedPlanId || busy === 'plan'}
            onClick={() =>
              run('plan', async () => {
                const { data } = await axios.patch(`/api/super-admin/agencies/${id}/plan`, {
                  planId: selectedPlanId,
                })
                if (!data.success) throw new Error(data.message)
                toast.success(data.message || 'Plan assigned')
              })
            }
            className="rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-sm px-4 py-2.5 text-white"
          >
            {busy === 'plan' ? 'Assigning…' : 'Assign plan'}
          </button>
        </div>
      </section>

      {/* Status controls */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-slate-400">Status controls</h2>
        <p className="text-sm text-slate-500">
          Suspend or set pending to block login without deleting fleet, bookings, or documents.
          Current SaaS status: <span className="text-slate-300 capitalize">{agency.status}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {['active', 'trial', 'pending', 'suspended'].map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy.startsWith('status-') || agency.status === status}
              onClick={() => requestStatus(status)}
              className={`rounded-lg px-3 py-2 text-sm capitalize border transition-colors disabled:opacity-40 ${
                agency.status === status
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                  : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {/* Editable profile */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 space-y-4">
        <h2 className="text-sm uppercase tracking-wider text-slate-400">Edit agency profile</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Agency name</label>
            <input
              value={edit.name}
              onChange={(e) => setEdit((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Legal name</label>
            <input
              value={edit.profile.legalName}
              onChange={(e) => setEdit((f) => ({ ...f, profile: { ...f.profile, legalName: e.target.value } }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Contact name</label>
            <input
              value={edit.contactName}
              onChange={(e) => setEdit((f) => ({ ...f, contactName: e.target.value }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Email</label>
            <input
              value={edit.email}
              onChange={(e) => setEdit((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Phone</label>
            <input
              value={edit.profile.phone}
              onChange={(e) => setEdit((f) => ({ ...f, profile: { ...f.profile, phone: e.target.value } }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">WhatsApp</label>
            <input
              value={edit.profile.whatsapp}
              onChange={(e) => setEdit((f) => ({ ...f, profile: { ...f.profile, whatsapp: e.target.value } }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Address</label>
            <input
              value={edit.profile.address}
              onChange={(e) => setEdit((f) => ({ ...f, profile: { ...f.profile, address: e.target.value } }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">City</label>
            <input
              value={edit.profile.city}
              onChange={(e) => setEdit((f) => ({ ...f, profile: { ...f.profile, city: e.target.value } }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Country</label>
            <input
              value={edit.profile.country}
              onChange={(e) => setEdit((f) => ({ ...f, profile: { ...f.profile, country: e.target.value } }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Logo URL</label>
            <input
              value={edit.profile.logo}
              onChange={(e) => setEdit((f) => ({ ...f, profile: { ...f.profile, logo: e.target.value } }))}
              placeholder="https://…"
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Primary domain / subdomain</label>
            <input
              value={edit.profile.primaryDomain}
              onChange={(e) => setEdit((f) => ({ ...f, profile: { ...f.profile, primaryDomain: e.target.value } }))}
              placeholder="agency.americonfort.com"
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Internal notes</label>
            <textarea
              rows={2}
              value={edit.notes}
              onChange={(e) => setEdit((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={busy === 'profile'}
          onClick={() =>
            run('profile', async () => {
              const { data } = await axios.patch(`/api/super-admin/agencies/${id}`, edit)
              if (!data.success) throw new Error(data.message)
              toast.success('Agency updated')
            })
          }
          className="rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-sm px-4 py-2.5 text-white"
        >
          Save profile
        </button>
      </section>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        body={confirm?.body}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        busy={busy.startsWith('status-')}
        onCancel={() => setConfirm(null)}
        onConfirm={() => applyStatus(confirm.status)}
      />
    </div>
  )
}

export default SuperAdminAgencyDetail

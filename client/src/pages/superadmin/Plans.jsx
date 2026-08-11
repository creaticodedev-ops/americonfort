import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSuperAdmin, saError } from '../../context/SuperAdminContext'

const emptyForm = () => ({
  code: '',
  name: '',
  description: '',
  features: [],
  limits: { maxVehicles: 0, maxUsers: 0, maxReservations: 0 },
  isActive: true,
  isDefault: false,
  sortOrder: 100,
})

const formatLimit = (n) => {
  const v = Number(n) || 0
  return v <= 0 ? 'Unlimited' : String(v)
}

const SuperAdminPlans = () => {
  const { axios } = useSuperAdmin()
  const [plans, setPlans] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axios.get('/api/super-admin/plans')
      if (!data.success) throw new Error(data.message)
      setPlans(data.plans || [])
      setCatalog(data.featureCatalog || [])
    } catch (error) {
      toast.error(saError(error))
    } finally {
      setLoading(false)
    }
  }, [axios])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyForm(),
      features: catalog.map((f) => f.key),
    })
    setShowForm(true)
  }

  const openEdit = (plan) => {
    setEditingId(plan.id)
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      features: [...(plan.features || [])],
      limits: {
        maxVehicles: plan.limits?.maxVehicles ?? 0,
        maxUsers: plan.limits?.maxUsers ?? 0,
        maxReservations: plan.limits?.maxReservations ?? 0,
      },
      isActive: plan.isActive !== false,
      isDefault: Boolean(plan.isDefault),
      sortOrder: plan.sortOrder ?? 100,
    })
    setShowForm(true)
  }

  const toggleFeature = (key) => {
    setForm((f) => {
      const has = f.features.includes(key)
      return {
        ...f,
        features: has ? f.features.filter((k) => k !== key) : [...f.features, key],
      }
    })
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy('save')
    try {
      if (editingId) {
        const { data } = await axios.patch(`/api/super-admin/plans/${editingId}`, {
          name: form.name,
          description: form.description,
          features: form.features,
          limits: form.limits,
          isActive: form.isActive,
          isDefault: form.isDefault,
          sortOrder: form.sortOrder,
        })
        if (!data.success) throw new Error(data.message)
        toast.success(data.message || 'Plan updated')
      } else {
        const { data } = await axios.post('/api/super-admin/plans', form)
        if (!data.success) throw new Error(data.message)
        toast.success('Plan created')
      }
      setShowForm(false)
      await load()
    } catch (error) {
      toast.error(saError(error))
    } finally {
      setBusy('')
    }
  }

  const setActive = async (plan, isActive) => {
    setBusy(`status-${plan.id}`)
    try {
      const { data } = await axios.patch(`/api/super-admin/plans/${plan.id}/status`, { isActive })
      if (!data.success) throw new Error(data.message)
      toast.success(data.message)
      await load()
    } catch (error) {
      toast.error(saError(error))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-white">Plans</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define product entitlements and limits. Billing and payments come in a later phase.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-sm px-4 py-2.5"
        >
          Create plan
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={save}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-wider text-slate-400">
              {editingId ? 'Edit plan' : 'New plan'}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Plan name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Code</label>
              <input
                required
                disabled={Boolean(editingId)}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                placeholder="starter"
                className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60 disabled:opacity-50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
              />
            </div>
            {[
              ['maxVehicles', 'Max vehicles (0 = unlimited)'],
              ['maxUsers', 'Max users/staff (0 = unlimited)'],
              ['maxReservations', 'Max reservations (0 = unlimited)'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-slate-500 mb-1">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={form.limits[key]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      limits: { ...f.limits, [key]: Number(e.target.value) || 0 },
                    }))
                  }
                  className="w-full rounded-lg bg-[#0a0f14] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-cyan-600/60"
                />
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Features</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {catalog.map((item) => {
                const checked = form.features.includes(item.key)
                return (
                  <label
                    key={item.key}
                    className={`flex gap-2 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                      checked
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100'
                        : 'border-white/10 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFeature(item.key)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-slate-200">{item.label}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">{item.description}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
            </label>
            <label className="inline-flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              />
              Default for new / legacy agencies
            </label>
          </div>

          <button
            type="submit"
            disabled={busy === 'save'}
            className="rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-sm px-4 py-2.5 text-white"
          >
            {busy === 'save' ? 'Saving…' : editingId ? 'Save changes' : 'Create plan'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading plans…</p>
      ) : (
        <div className="grid gap-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg text-white font-medium">{plan.name}</h2>
                    {plan.isDefault ? (
                      <span className="text-[11px] rounded-full px-2 py-0.5 bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30">
                        Default
                      </span>
                    ) : null}
                    <span
                      className={`text-[11px] rounded-full px-2 py-0.5 ring-1 ${
                        plan.isActive
                          ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                          : 'bg-slate-500/15 text-slate-400 ring-slate-500/30'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{plan.code}</p>
                  {plan.description ? (
                    <p className="text-sm text-slate-400 mt-2 max-w-2xl">{plan.description}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(plan)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy === `status-${plan.id}` || plan.isDefault}
                    onClick={() => setActive(plan, !plan.isActive)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-40"
                  >
                    {plan.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              <dl className="mt-4 grid sm:grid-cols-4 gap-2 text-sm">
                <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">Vehicles</dt>
                  <dd className="text-slate-200 mt-0.5">{formatLimit(plan.limits?.maxVehicles)}</dd>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">Users</dt>
                  <dd className="text-slate-200 mt-0.5">{formatLimit(plan.limits?.maxUsers)}</dd>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">Reservations</dt>
                  <dd className="text-slate-200 mt-0.5">{formatLimit(plan.limits?.maxReservations)}</dd>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2">
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">Agencies</dt>
                  <dd className="text-slate-200 mt-0.5">{plan.agencyCount ?? 0}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(plan.features || []).map((key) => {
                  const label = catalog.find((c) => c.key === key)?.label || key
                  return (
                    <span
                      key={key}
                      className="text-[11px] rounded-md px-2 py-1 bg-white/5 text-slate-300 border border-white/10"
                    >
                      {label}
                    </span>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default SuperAdminPlans

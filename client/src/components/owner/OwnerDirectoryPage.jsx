import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Title from './Title'
import { useAppContext } from '../../context/AppContext'
import { getErrorMessage } from '../../utils/apiError'

const StatusBadge = ({ status }) => {
  const map = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    signed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expired: 'bg-orange-50 text-orange-800 border-orange-200',
    none: 'bg-gray-50 text-gray-500 border-gray-200',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${map[status] || map.none}`}>
      {status || '—'}
    </span>
  )
}

/**
 * Lightweight reusable CRUD list for partner/chauffeur directories.
 */
const OwnerDirectoryPage = ({
  title,
  subtitle,
  endpoint,
  columns,
  emptyLabel = 'No records yet',
  buildForm,
  initialForm,
  nameField = 'fullName',
}) => {
  const { axios } = useAppContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ pages: 1, total: 0 })
  const [modal, setModal] = useState(null) // create | edit
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search.trim()) params.set('search', search.trim())
      if (status !== 'all') params.set('status', status)
      const { data } = await axios.get(`${endpoint}?${params}`)
      if (data.success) {
        setItems(data.items || [])
        setPagination(data.pagination || { pages: 1, total: 0 })
      } else toast.error(data.message || 'Failed to load')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [axios, endpoint, page, search, status])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm(initialForm)
    setModal({ mode: 'create' })
  }

  const openEdit = (item) => {
    setForm({ ...initialForm, ...item })
    setModal({ mode: 'edit', id: item._id })
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form }
      delete payload._id
      delete payload.owner
      delete payload.createdAt
      delete payload.updatedAt
      delete payload.__v
      delete payload.createdBy
      delete payload.updatedBy
      if (modal.mode === 'create') {
        const { data } = await axios.post(endpoint, payload)
        if (!data.success) throw new Error(data.message)
        toast.success('Created')
      } else {
        const { data } = await axios.patch(`${endpoint}/${modal.id}`, payload)
        if (!data.success) throw new Error(data.message)
        toast.success('Updated')
      }
      setModal(null)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (item) => {
    const next = item.status === 'active' ? 'inactive' : 'active'
    if (!window.confirm(`${next === 'inactive' ? 'Deactivate' : 'Activate'} ${item[nameField] || 'this record'}?`)) return
    try {
      const { data } = await axios.post(`${endpoint}/${item._id}/status`, { status: next })
      if (!data.success) throw new Error(data.message)
      toast.success(`Marked ${next}`)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <div className="px-4 pt-6 md:px-8 lg:px-10 xl:px-12 pb-16 flex-1 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <Title title={title} subTitle={subtitle} />
        <button type="button" onClick={openCreate} className="h-10 px-4 rounded-lg bg-primary text-white text-sm hover:bg-primary-dull">
          Add new
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          className="h-10 px-3 rounded-lg border border-borderColor text-sm flex-1"
          placeholder="Search…"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value) }}
        />
        <select
          className="h-10 px-3 rounded-lg border border-borderColor text-sm"
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value) }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="rounded-xl border border-borderColor bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">{emptyLabel}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-medium">{c.label}</th>
                  ))}
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-t border-borderColor">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 align-top">
                        {c.render ? c.render(item) : (item[c.key] ?? '—')}
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button type="button" className="text-primary text-xs mr-3" onClick={() => openEdit(item)}>Edit</button>
                      <button type="button" className="text-gray-600 text-xs" onClick={() => toggleStatus(item)}>
                        {item.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <button type="button" disabled={page <= 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40" onClick={() => setPage((p) => p - 1)}>Prev</button>
          <span className="text-xs text-gray-500">Page {page} / {pagination.pages}</span>
          <button type="button" disabled={page >= pagination.pages} className="px-3 py-1 border rounded text-sm disabled:opacity-40" onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{modal.mode === 'create' ? 'Create' : 'Edit'}</h2>
            <div className="space-y-3">
              {buildForm(form, setForm)}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="px-4 h-10 rounded-lg border text-sm" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" disabled={saving} className="px-4 h-10 rounded-lg bg-primary text-white text-sm disabled:opacity-50" onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { StatusBadge }
export default OwnerDirectoryPage

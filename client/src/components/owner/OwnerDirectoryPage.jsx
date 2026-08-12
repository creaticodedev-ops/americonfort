import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import StatusBadge from './StatusBadge'
import DataTable from './DataTable'
import Pagination from './Pagination'
import {
  AdminPage,
  PageHeader,
  FilterBar,
  SearchInput,
  AdminModal,
} from './ui'
import { useAppContext } from '../../context/AppContext'
import { getErrorMessage } from '../../utils/apiError'

/**
 * Reusable professional directory for chauffeurs / samsars / partners.
 */
const OwnerDirectoryPage = ({
  title,
  subtitle,
  endpoint,
  columns,
  emptyLabel = 'No records yet',
  emptyDescription = 'Create your first record to start assigning it on reservations.',
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
  const [modal, setModal] = useState(null)
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

  useEffect(() => {
    load()
  }, [load])

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

  const tableColumns = [
    ...columns.map((c) => ({
      key: c.key,
      label: c.label,
      render: c.render
        ? (row) => c.render(row)
        : c.key === 'status'
          ? (row) => <StatusBadge status={row.status} />
          : undefined,
    })),
    {
      key: 'actions',
      label: 'Actions',
      className: 'whitespace-nowrap',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button type="button" className="text-xs font-medium text-[var(--admin-accent)]" onClick={() => openEdit(item)}>
            Edit
          </button>
          <button
            type="button"
            className="text-xs font-medium text-[var(--admin-fg-secondary)]"
            onClick={() => toggleStatus(item)}
          >
            {item.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminPage>
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          <button type="button" onClick={openCreate} className="admin-btn admin-btn--primary">
            Add new
          </button>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(v) => {
            setPage(1)
            setSearch(v)
          }}
          placeholder="Search…"
        />
        <select
          className="h-9 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm text-[var(--admin-fg)]"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FilterBar>

      <DataTable
        columns={tableColumns}
        data={items}
        loading={loading}
        emptyMessage={emptyLabel}
        emptyDescription={emptyDescription}
        emptyAction={
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            Add new
          </button>
        }
      />

      {pagination.pages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={pagination.pages}
            total={pagination.total}
            limit={20}
            onPageChange={setPage}
          />
        </div>
      )}

      <AdminModal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Create' : 'Edit'}
        footer={
          <>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" disabled={saving} className="admin-btn admin-btn--primary" onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-3">{buildForm(form, setForm)}</div>
      </AdminModal>
    </AdminPage>
  )
}

export { StatusBadge }
export default OwnerDirectoryPage

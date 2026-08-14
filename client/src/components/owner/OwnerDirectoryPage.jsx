import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'

const SEARCH_DEBOUNCE_MS = 300

/** Stable shell — keeps form field DOM mounted while values change. */
const DirectoryFormBody = React.memo(function DirectoryFormBody({ FormComponent, buildForm, form, patchForm, formProps }) {
  if (FormComponent) {
    return (
      <div className="space-y-3">
        <FormComponent form={form} patchForm={patchForm} {...formProps} />
      </div>
    )
  }
  if (buildForm) {
    return <div className="space-y-3">{buildForm(form, patchForm)}</div>
  }
  return null
})

/**
 * Reusable professional directory for chauffeurs / samsars / partners / employees.
 * Pass a module-level FormComponent (not an inline render prop) so inputs are not remounted.
 */
const OwnerDirectoryPage = ({
  title,
  subtitle,
  endpoint,
  columns,
  emptyLabel,
  emptyDescription,
  FormComponent,
  /** @deprecated use FormComponent — kept for callers not yet migrated */
  buildForm,
  formProps,
  initialForm,
  nameField = 'fullName',
}) => {
  const { axios } = useAppContext()
  const { t } = useI18n()
  const tRef = useRef(t)
  tRef.current = t

  const initialFormRef = useRef(initialForm)
  initialFormRef.current = initialForm

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ pages: 1, total: 0 })
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    hasLoadedRef.current = false
  }, [endpoint])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [search])

  const load = useCallback(async () => {
    const silent = hasLoadedRef.current
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (status !== 'all') params.set('status', status)
      const { data } = await axios.get(`${endpoint}?${params}`)
      if (data.success) {
        setItems(data.items || [])
        setPagination(data.pagination || { pages: 1, total: 0 })
      } else toast.error(data.message || tRef.current('admin.common.loadFailed'))
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
    }
  }, [axios, endpoint, page, debouncedSearch, status])

  useEffect(() => {
    load()
  }, [load])

  const closeModal = useCallback(() => setModal(null), [])

  const patchForm = useCallback((patch) => {
    setForm((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }))
  }, [])

  const openCreate = useCallback(() => {
    setForm(initialFormRef.current)
    setModal({ mode: 'create' })
  }, [])

  const openEdit = useCallback((item) => {
    setForm({ ...initialFormRef.current, ...item })
    setModal({ mode: 'edit', id: item._id })
  }, [])

  const save = useCallback(async () => {
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
        toast.success(t('admin.common.created'))
      } else {
        const { data } = await axios.patch(`${endpoint}/${modal.id}`, payload)
        if (!data.success) throw new Error(data.message)
        toast.success(t('admin.common.updated'))
      }
      setModal(null)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }, [axios, endpoint, form, load, modal, t])

  const toggleStatus = useCallback(async (item) => {
    const next = item.status === 'active' ? 'inactive' : 'active'
    const name = item[nameField] || t('admin.common.thisRecord')
    const confirmMsg =
      next === 'inactive'
        ? t('admin.common.confirmDeactivate', { name })
        : t('admin.common.confirmActivate', { name })
    if (!window.confirm(confirmMsg)) return
    try {
      const { data } = await axios.post(`${endpoint}/${item._id}/status`, { status: next })
      if (!data.success) throw new Error(data.message)
      toast.success(t('admin.common.statusUpdated', { status: next }))
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }, [endpoint, load, nameField, t, axios])

  const tableColumns = useMemo(
    () => [
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
        label: t('admin.common.actions'),
        className: 'whitespace-nowrap',
        render: (item) => (
          <div className="flex items-center gap-2">
            <button type="button" className="text-xs font-medium text-[var(--admin-accent)]" onClick={() => openEdit(item)}>
              {t('admin.common.edit')}
            </button>
            <button
              type="button"
              className="text-xs font-medium text-[var(--admin-fg-secondary)]"
              onClick={() => toggleStatus(item)}
            >
              {item.status === 'active' ? t('admin.common.deactivate') : t('admin.common.activate')}
            </button>
          </div>
        ),
      },
    ],
    [columns, openEdit, t, toggleStatus],
  )

  const drawerFooter = useMemo(
    () => (
      <>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={closeModal}>
          {t('admin.common.cancel')}
        </button>
        <button type="button" disabled={saving} className="admin-btn admin-btn--primary" onClick={save}>
          {saving ? t('admin.common.saving') : t('admin.common.save')}
        </button>
      </>
    ),
    [closeModal, save, saving, t],
  )

  const drawerTitle = modal?.mode === 'create' ? t('admin.common.create') : t('admin.common.edit')

  return (
    <AdminPage>
      <PageHeader
        title={title}
        description={subtitle}
        actions={
          <button type="button" onClick={openCreate} className="admin-btn admin-btn--primary">
            {t('admin.common.addNew')}
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
          placeholder={t('admin.common.search')}
        />
        <select
          className="h-9 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm text-[var(--admin-fg)]"
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="all">{t('admin.common.allStatuses')}</option>
          <option value="active">{t('admin.common.active')}</option>
          <option value="inactive">{t('admin.common.inactive')}</option>
        </select>
      </FilterBar>

      <DataTable
        columns={tableColumns}
        data={items}
        loading={loading}
        emptyMessage={emptyLabel || t('admin.common.empty')}
        emptyDescription={emptyDescription || t('admin.common.emptyHint')}
        emptyAction={
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            {t('admin.common.addNew')}
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
        onClose={closeModal}
        title={drawerTitle}
        footer={drawerFooter}
        variant="drawer"
      >
        {modal && (FormComponent || buildForm) ? (
          <DirectoryFormBody
            FormComponent={FormComponent}
            buildForm={buildForm}
            form={form}
            patchForm={patchForm}
            formProps={formProps}
          />
        ) : null}
      </AdminModal>
    </AdminPage>
  )
}

export { StatusBadge }
export default OwnerDirectoryPage

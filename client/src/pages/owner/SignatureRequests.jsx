import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import StatusBadge from '../../components/owner/StatusBadge'
import DataTable from '../../components/owner/DataTable'
import {
  AdminPage,
  PageHeader,
  FilterBar,
  SearchInput,
  SegmentedControl,
} from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'

const SignatureRequests = () => {
  const { axios, hasPermission } = useAppContext()
  const { t } = useI18n()
  const tRef = useRef(t)
  tRef.current = t
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const hasLoadedRef = useRef(false)

  const statusOpts = [
    { id: 'all', label: t('admin.status.all') },
    { id: 'pending', label: t('admin.status.pending') },
    { id: 'signed', label: t('admin.status.signed') },
    { id: 'expired', label: t('admin.status.expired') },
    { id: 'cancelled', label: t('admin.status.cancelled') },
  ]

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(id)
  }, [search])

  const load = useCallback(async () => {
    const silent = hasLoadedRef.current
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (status !== 'all') params.set('status', status)
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const { data } = await axios.get(`/api/owner/signature-requests?${params}`)
      if (data.success) setItems(data.items || [])
      else toast.error(data.message || tRef.current('admin.signatures.loadFailed'))
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
    }
  }, [axios, status, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  const copyLink = async (url) => {
    if (!url) return toast.error(t('admin.signatures.noLink'))
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('admin.signatures.linkCopied'))
    } catch {
      toast.error(t('admin.signatures.copyFailed'))
    }
  }

  const act = async (path, bookingId, okMsg) => {
    try {
      const { data } = await axios.post(`/api/owner/signature-requests/${path}`, { bookingId })
      if (!data.success) throw new Error(data.message)
      toast.success(okMsg)
      if (data.completionUrl) await copyLink(data.completionUrl)
      load()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  if (!hasPermission('signature_requests')) {
    return (
      <AdminPage>
        <PageHeader title={t('admin.signatures.title')} />
        <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.signatures.noAccess')}</p>
      </AdminPage>
    )
  }

  const pendingCount = items.filter((r) => r.status === 'pending').length

  const columns = [
    {
      key: 'reservation',
      label: t('admin.signatures.reservation'),
      render: (row) => (
        <div>
          <p className="font-medium">{row.reservationId || '—'}</p>
          <Link
            to={`/owner/manage-bookings`}
            className="text-[11px] text-[var(--admin-accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            {t('admin.signatures.openReservations')}
          </Link>
        </div>
      ),
    },
    { key: 'customerName', label: t('admin.signatures.customer'), render: (row) => row.customerName || '—' },
    {
      key: 'vehicle',
      label: t('admin.signatures.vehicle'),
      render: (row) => (row.car ? `${row.car.brand} ${row.car.model}` : '—'),
    },
    {
      key: 'status',
      label: t('admin.signatures.status'),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: t('admin.signatures.actions'),
      className: 'whitespace-nowrap',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {(row.status === 'none' || row.status === 'expired' || row.status === 'cancelled') && (
            <button
              type="button"
              className="text-xs font-medium text-[var(--admin-accent)]"
              onClick={() => act('generate', row.bookingId, t('admin.signatures.generated'))}
            >
              {t('admin.signatures.generate')}
            </button>
          )}
          {row.status === 'pending' && (
            <>
              <button
                type="button"
                className="text-xs font-medium text-[var(--admin-accent)]"
                onClick={() => copyLink(row.shareableCompletionUrl)}
              >
                {t('admin.signatures.copyLink')}
              </button>
              <button
                type="button"
                className="text-xs font-medium text-[var(--admin-accent)]"
                onClick={() => act('resend', row.bookingId, t('admin.signatures.resent'))}
              >
                {t('admin.signatures.resend')}
              </button>
              <button
                type="button"
                className="text-xs font-medium text-[var(--admin-danger)]"
                onClick={() => {
                  if (window.confirm(t('admin.signatures.cancelConfirm'))) {
                    act('cancel', row.bookingId, t('admin.signatures.cancelled'))
                  }
                }}
              >
                {t('admin.signatures.cancel')}
              </button>
            </>
          )}
          {row.status === 'signed' && (
            <span className="text-xs text-[var(--admin-success)] font-medium">{t('admin.signatures.signed')}</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.signatures.title')}
        description={t('admin.signatures.subtitle')}
        breadcrumbs={[
          { label: t('admin.signatures.documents'), to: '/owner/signature-requests' },
          { label: t('admin.signatures.signatures') },
        ]}
        actions={
          pendingCount > 0 ? (
            <span className="admin-badge admin-badge--pending">
              {t('admin.signatures.pendingCount', { count: pendingCount })}
            </span>
          ) : null
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('admin.signatures.search')}
        />
        <SegmentedControl
          options={statusOpts}
          value={status}
          onChange={setStatus}
          ariaLabel={t('admin.commonUi.signatureStatus')}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage={t('admin.signatures.empty')}
        emptyDescription={t('admin.signatures.emptyHint')}
        emptyIcon="signature"
        emptyAction={
          <Link to="/owner/manage-bookings" className="admin-btn admin-btn--primary">
            {t('admin.signatures.goReservations')}
          </Link>
        }
      />
    </AdminPage>
  )
}

export default SignatureRequests

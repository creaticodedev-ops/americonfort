import React, { useCallback, useEffect, useState } from 'react'
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
import { getErrorMessage } from '../../utils/apiError'

const STATUS_OPTS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'signed', label: 'Signed' },
  { id: 'expired', label: 'Expired' },
  { id: 'cancelled', label: 'Cancelled' },
]

const SignatureRequests = () => {
  const { axios, hasPermission } = useAppContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (status !== 'all') params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      const { data } = await axios.get(`/api/owner/signature-requests?${params}`)
      if (data.success) setItems(data.items || [])
      else toast.error(data.message || 'Failed to load')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [axios, status, search])

  useEffect(() => {
    load()
  }, [load])

  const copyLink = async (url) => {
    if (!url) return toast.error('No link available')
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy')
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
        <PageHeader title="Signature Requests" />
        <p className="text-sm text-[var(--admin-fg-muted)]">You do not have access to this module.</p>
      </AdminPage>
    )
  }

  const pendingCount = items.filter((r) => r.status === 'pending').length

  const columns = [
    {
      key: 'reservation',
      label: 'Reservation',
      render: (row) => (
        <div>
          <p className="font-medium">{row.reservationId || '—'}</p>
          <Link
            to={`/owner/manage-bookings`}
            className="text-[11px] text-[var(--admin-accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            Open reservations
          </Link>
        </div>
      ),
    },
    { key: 'customerName', label: 'Customer', render: (row) => row.customerName || '—' },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (row) => (row.car ? `${row.car.brand} ${row.car.model}` : '—'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'whitespace-nowrap',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {(row.status === 'none' || row.status === 'expired' || row.status === 'cancelled') && (
            <button
              type="button"
              className="text-xs font-medium text-[var(--admin-accent)]"
              onClick={() => act('generate', row.bookingId, 'Link generated')}
            >
              Generate
            </button>
          )}
          {row.status === 'pending' && (
            <>
              <button
                type="button"
                className="text-xs font-medium text-[var(--admin-accent)]"
                onClick={() => copyLink(row.shareableCompletionUrl)}
              >
                Copy link
              </button>
              <button
                type="button"
                className="text-xs font-medium text-[var(--admin-accent)]"
                onClick={() => act('resend', row.bookingId, 'Link resent')}
              >
                Resend
              </button>
              <button
                type="button"
                className="text-xs font-medium text-[var(--admin-danger)]"
                onClick={() => {
                  if (window.confirm('Cancel this signature request?')) {
                    act('cancel', row.bookingId, 'Cancelled')
                  }
                }}
              >
                Cancel
              </button>
            </>
          )}
          {row.status === 'signed' && (
            <span className="text-xs text-[var(--admin-success)] font-medium">Signed</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <AdminPage>
      <PageHeader
        title="Signature Requests"
        description="Document signature queue. Pending requests need attention before pickup."
        breadcrumbs={[
          { label: 'Documents', to: '/owner/signature-requests' },
          { label: 'Signatures' },
        ]}
        actions={
          pendingCount > 0 ? (
            <span className="admin-badge admin-badge--pending">{pendingCount} pending</span>
          ) : null
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search reservation / customer"
        />
        <SegmentedControl options={STATUS_OPTS} value={status} onChange={setStatus} ariaLabel="Signature status" />
      </FilterBar>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        emptyMessage="No signature requests yet"
        emptyDescription="Generate a signature link from a reservation to start the completion workflow."
        emptyIcon="signature"
        emptyAction={
          <Link to="/owner/manage-bookings" className="admin-btn admin-btn--primary">
            Go to reservations
          </Link>
        }
      />
    </AdminPage>
  )
}

export default SignatureRequests

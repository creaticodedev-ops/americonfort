import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import {
  AdminPage,
  PageHeader,
  StatCard,
  SegmentedControl,
  Skeleton,
} from '../../../components/owner/ui'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { getErrorMessage } from '../../../utils/apiError'

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
]

const AccountingOverview = () => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const cur = `${String(currency || 'MAD').trim()} `
  const [period, setPeriod] = useState('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (period === 'custom') {
        if (from) params.set('from', from)
        if (to) params.set('to', to)
      }
      const { data } = await axios.get(`/api/owner/accounting/overview?${params}`)
      if (data.success) setOverview(data.overview)
      else toast.error(data.message || 'Failed to load')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [axios, period, from, to])

  useEffect(() => {
    load()
  }, [load])

  const k = overview?.kpis || {}
  const money = (n) =>
    `${cur}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  const rangeLabel =
    overview?.from && overview?.to
      ? `${new Date(overview.from).toLocaleDateString()} – ${new Date(overview.to).toLocaleDateString()}`
      : ''

  return (
    <AdminPage>
      <PageHeader
        title="Accounting"
        description="Agency financial overview. Gross revenue is derived from bookings — never edited manually."
        breadcrumbs={[
          { label: 'Finance', to: '/owner/accounting' },
          { label: 'Overview' },
        ]}
        actions={<SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />}
      />

      {period === 'custom' && (
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <input
            type="date"
            className="h-9 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-xs text-[var(--admin-fg-muted)]">to</span>
          <input
            type="date"
            className="h-9 px-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface)] text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      )}

      {rangeLabel && (
        <p className="text-xs text-[var(--admin-fg-muted)] mb-4">
          Period: {rangeLabel} · {overview?.breakdown?.revenue?.bookingCount || 0} revenue bookings
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--admin-radius-lg)]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
            <StatCard label="Gross Revenue" value={money(k.grossRevenue)} tone="success" />
            <StatCard label="Samsar Payments" value={money(k.samsarPayments)} hint="Commissions paid" />
            <StatCard label="Agency Expenses" value={money(k.agencyExpenses)} />
            <StatCard label="Vehicle Expenses" value={money(k.vehicleExpenses)} />
            <StatCard
              label="Net Result"
              value={money(k.netResult)}
              tone={Number(k.netResult) >= 0 ? 'success' : 'danger'}
              hint="Bottom line for the period"
            />
          </div>

          {Number(k.partnerDiscountApplied) > 0 && (
            <div className="mb-4 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-3 text-sm">
              <p className="font-medium text-[var(--admin-fg)]">
                {t('admin.accounting.partnerDiscountApplied')}:{' '}
                <span className="tabular-nums">{money(k.partnerDiscountApplied)}</span>
              </p>
              <p className="text-xs text-[var(--admin-fg-muted)] mt-1">
                {t('admin.accounting.partnerDiscountHint')}
              </p>
            </div>
          )}

          <div className="admin-formula mb-6">
            <div className="admin-formula-row">
              <span>Gross Revenue</span>
              <span className="tabular-nums text-[var(--admin-fg)]">{money(k.grossRevenue)}</span>
            </div>
            <div className="admin-formula-row">
              <span>
                <span className="admin-formula-op">−</span>Samsar Payments
              </span>
              <span className="tabular-nums">{money(k.samsarPayments)}</span>
            </div>
            <div className="admin-formula-row">
              <span>
                <span className="admin-formula-op">−</span>Agency Expenses
              </span>
              <span className="tabular-nums">{money(k.agencyExpenses)}</span>
            </div>
            <div className="admin-formula-row">
              <span>
                <span className="admin-formula-op">−</span>Vehicle Expenses
              </span>
              <span className="tabular-nums">{money(k.vehicleExpenses)}</span>
            </div>
            <div className="admin-formula-row is-total">
              <span>= Net Result</span>
              <span className="tabular-nums">{money(k.netResult)}</span>
            </div>
            <p className="text-[11px] text-[var(--admin-fg-muted)] mt-2">
              Paid revenue {money(k.paidRevenue)} · Unpaid {money(k.unpaidRevenue)} · Cancelled bookings excluded
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Revenues', 'Booking revenue ledger', '/owner/accounting/revenues'],
              ['Samsar Payments', 'Commission payouts', '/owner/accounting/samsar-payments'],
              ['Agency Expenses', 'Charges agences', '/owner/accounting/agency-expenses'],
              ['Vehicle Expenses', 'Charges voitures', '/owner/accounting/vehicle-expenses'],
            ].map(([label, hint, toPath]) => (
              <Link key={toPath} to={toPath} className="admin-stat admin-stat--interactive no-underline">
                <p className="admin-stat-label">{label}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--admin-fg)]">{hint}</p>
                <p className="mt-auto pt-3 text-xs font-medium text-[var(--admin-accent)]">Open →</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </AdminPage>
  )
}

export default AccountingOverview

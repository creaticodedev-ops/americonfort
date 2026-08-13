import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RevenueChart from '../../components/owner/RevenueChart'
import StatusBadge from '../../components/owner/StatusBadge'
import {
  AdminPage,
  PageHeader,
  StatCard,
  ChartCard,
  SegmentedControl,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

const Dashboard = () => {
  const { axios, isOwner, currency, hasPermission, hasFeature } = useAppContext()
  const { t } = useI18n()
  const [dash, setDash] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [accounting, setAccounting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [error, setError] = useState('')

  const [pendingSignatures, setPendingSignatures] = useState(null)

  const canAccounting = hasPermission('accounting') && hasFeature('accounting')
  const canSignatures = hasPermission('signature_requests') && hasFeature('signature_requests')

  const load = async () => {
    if (!isOwner) return
    setLoading(true)
    setError('')
    try {
      const reqs = [
        axios.get('/api/owner/ops-dashboard'),
        axios.get('/api/owner/analytics'),
      ]
      if (canAccounting) {
        reqs.push(axios.get(`/api/owner/accounting/overview?period=${period === '7d' || period === '30d' ? 'month' : period}`))
      } else {
        reqs.push(Promise.resolve(null))
      }
      if (canSignatures) {
        reqs.push(axios.get('/api/owner/signature-requests?status=pending&limit=1'))
      } else {
        reqs.push(Promise.resolve(null))
      }
      const [ops, an, acc, sig] = await Promise.all(reqs)
      if (ops.data.success) setDash(ops.data.dashboard)
      else throw new Error(ops.data.message || t('admin.shell.loadError'))
      if (an.data.success) setAnalytics(an.data.analytics)
      if (acc?.data?.success) setAccounting(acc.data.overview)
      if (sig?.data?.success) {
        setPendingSignatures(sig.data.pagination?.total ?? (sig.data.items?.length || 0))
      } else {
        setPendingSignatures(null)
      }
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, axios, canAccounting, canSignatures, period])

  const statusDistribution = useMemo(() => {
    const raw = analytics?.byStatus
    if (!raw) return []
    if (Array.isArray(raw)) {
      return raw.map((row) => ({
        key: row._id || row.status || row.key,
        label: String(row._id || row.status || row.key || '').replace(/_/g, ' '),
        value: Number(row.count ?? row.value ?? 0),
      }))
    }
    return Object.entries(raw).map(([key, value]) => ({
      key,
      label: key.replace(/_/g, ' '),
      value: Number(value) || 0,
    }))
  }, [analytics])

  const money = (n) =>
    `${currency}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  if (loading) {
    return (
      <AdminPage>
        <PageHeader title={t('admin.dashboard.title')} description={t('admin.dashboard.subtitle')} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[7.25rem] rounded-[var(--admin-radius-lg)]" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Skeleton className="h-64 rounded-[var(--admin-radius-lg)]" />
          <Skeleton className="h-64 rounded-[var(--admin-radius-lg)]" />
        </div>
      </AdminPage>
    )
  }

  if (error && !dash) {
    return (
      <AdminPage>
        <PageHeader title={t('admin.dashboard.title')} />
        <div className="admin-panel">
          <ErrorState title={t('admin.shell.loadError')} description={error} onRetry={load} />
        </div>
      </AdminPage>
    )
  }

  if (!dash) return null

  const kpis = accounting?.kpis || {}
  const trend = analytics?.monthlyTrend || []
  const spark = trend.slice(-8).map((d) => d.amount || 0)

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.dashboard.title')}
        description={t('admin.ops.pulse')}
        actions={
          <>
            <SegmentedControl
              options={[
                { id: '7d', label: t('admin.ops.period7d') },
                { id: '30d', label: t('admin.ops.period30d') },
                { id: 'month', label: t('admin.ops.periodMonth') },
                { id: 'year', label: t('admin.ops.periodYear') },
              ]}
              value={period}
              onChange={setPeriod}
              ariaLabel={t('admin.ops.periodAria')}
            />
            <Link to="/owner/manage-bookings" className="admin-btn admin-btn--primary">
              {t('admin.ops.reservations')}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label={t('admin.ops.revenue')}
          value={money(canAccounting ? kpis.grossRevenue ?? dash.monthlyRevenue : dash.monthlyRevenue)}
          hint={canAccounting ? t('admin.ops.grossHint') : t('admin.dashboard.monthlyRevenue')}
          spark={spark}
          tone="success"
          to={canAccounting ? '/owner/accounting' : '/owner/analytics'}
        />
        {canAccounting ? (
          <StatCard
            label={t('admin.ops.netResult')}
            value={money(kpis.netResult)}
            hint={t('admin.ops.afterExpenses')}
            tone={Number(kpis.netResult) >= 0 ? 'success' : 'danger'}
            to="/owner/accounting"
          />
        ) : (
          <StatCard
            label={t('admin.dashboard.monthlyRevenue')}
            value={money(dash.monthlyRevenue)}
            hint={t('admin.ops.thisMonth')}
            tone="success"
          />
        )}
        <StatCard
          label={t('admin.ops.reservations')}
          value={dash.todayBookings}
          hint={t('admin.ops.createdToday')}
          tone="info"
          to="/owner/manage-bookings"
        />
        <StatCard
          label={t('admin.dashboard.activeRentals')}
          value={dash.activeRentals}
          hint={t('admin.ops.currentlyOnRent')}
          tone="success"
          to="/owner/manage-bookings"
        />
        <StatCard
          label={t('admin.dashboard.fleetUtilization')}
          value={`${dash.fleetUtilization}%`}
          hint={t('admin.dashboard.fleetUtilSub')}
        />
        <StatCard
          label={t('admin.ops.pendingPayments')}
          value={dash.pendingBookings}
          hint={t('admin.ops.awaitingAction')}
          tone={dash.pendingBookings ? 'warning' : 'default'}
          to="/owner/manage-bookings"
        />
        <StatCard
          label={t('admin.ops.pendingSignatures')}
          value={pendingSignatures == null ? '—' : pendingSignatures}
          hint={canSignatures ? t('admin.ops.openQueue') : t('admin.ops.enableSignatures')}
          tone={pendingSignatures ? 'warning' : 'default'}
          to={canSignatures ? '/owner/signature-requests' : undefined}
        />
        <StatCard
          label={t('admin.ops.expenses')}
          value={
            canAccounting
              ? money(
                  Number(kpis.agencyExpenses || 0) +
                    Number(kpis.vehicleExpenses || 0) +
                    Number(kpis.samsarPayments || 0),
                )
              : '—'
          }
          hint={canAccounting ? t('admin.ops.expenseHint') : t('admin.ops.requiresAccounting')}
          tone="default"
          to={canAccounting ? '/owner/accounting' : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-4 mt-4">
        <ChartCard
          className="lg:col-span-3"
          title={t('admin.dashboard.revenueTrend')}
          action={
            <Link to="/owner/analytics" className="text-xs font-medium text-[var(--admin-accent)]">
              {t('admin.dashboard.viewAll')}
            </Link>
          }
        >
          <RevenueChart data={trend} currency={currency} height={200} />
        </ChartCard>

        <ChartCard className="lg:col-span-2" title={t('admin.dashboard.fleetSnapshot')}>
          <div className="grid grid-cols-2 gap-2">
            {[
              [t('admin.ops.available'), dash.availableVehicles, 'success'],
              [t('admin.ops.onRent'), dash.rentedVehicles, 'info'],
              [t('admin.ops.maintenance'), dash.maintenanceVehicles, 'warning'],
              [t('admin.ops.totalFleet'), dash.totalCars, 'default'],
            ].map(([label, value, tone]) => (
              <div
                key={label}
                className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-3"
              >
                <p className="text-[11px] text-[var(--admin-fg-muted)] uppercase tracking-wide">{label}</p>
                <p className={`mt-1 text-xl font-semibold tabular-nums ${
                  tone === 'success'
                    ? 'text-[var(--admin-success)]'
                    : tone === 'info'
                      ? 'text-[var(--admin-info)]'
                      : tone === 'warning'
                        ? 'text-[var(--admin-warning)]'
                        : 'text-[var(--admin-fg)]'
                }`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          <Link to="/owner/manage-cars" className="mt-3 inline-block text-xs font-medium text-[var(--admin-accent)]">
            {t('admin.ops.manageFleet')}
          </Link>
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <ChartCard
          title={t('admin.ops.recentReservations')}
          action={
            <Link to="/owner/manage-bookings" className="text-xs font-medium text-[var(--admin-accent)]">
              {t('admin.ops.viewAll')}
            </Link>
          }
        >
          {(dash.recentBookings || []).length === 0 ? (
            <EmptyState
              icon="calendar"
              title={t('admin.ops.noRecent')}
              description={t('admin.ops.noRecentHint')}
            />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.ops.customer')}</th>
                    <th>{t('admin.ops.vehicle')}</th>
                    <th>{t('admin.ops.amount')}</th>
                    <th>{t('admin.ops.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(dash.recentBookings || []).map((b) => (
                    <tr key={b._id}>
                      <td>
                        <p className="font-medium text-[var(--admin-fg)] truncate max-w-[9rem]">
                          {b.customerName || t('admin.common.guest')}
                        </p>
                        <p className="text-[11px] text-[var(--admin-fg-muted)]">{b.reservationId}</p>
                      </td>
                      <td className="text-[var(--admin-fg-secondary)]">
                        {b.car?.brand} {b.car?.model}
                      </td>
                      <td className="tabular-nums">{money(b.price)}</td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        <ChartCard title={t('admin.ops.pendingActions')}>
          <ul className="space-y-2">
            {[
              {
                label: t('admin.ops.pendingReservations'),
                value: dash.pendingBookings,
                to: '/owner/manage-bookings',
                show: true,
              },
              {
                label: t('admin.ops.overdueReturns'),
                value: dash.overdueCount,
                to: '/owner/manage-bookings',
                show: true,
              },
              {
                label: t('admin.ops.vehiclesOffline'),
                value: dash.maintenanceVehicles,
                to: '/owner/maintenance',
                show: hasPermission('maintenance'),
              },
              {
                label: t('admin.ops.upcomingReturns'),
                value: dash.upcomingReturns?.length || 0,
                to: '/owner/calendar',
                show: hasPermission('calendar'),
              },
            ]
              .filter((item) => item.show)
              .map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="flex items-center justify-between gap-3 rounded-[var(--admin-radius)] border border-[var(--admin-border)] px-3 py-2.5 hover:bg-[var(--admin-surface-hover)] transition-colors"
                  >
                    <span className="text-sm text-[var(--admin-fg-secondary)]">{item.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${
                      Number(item.value) > 0 ? 'text-[var(--admin-warning)]' : 'text-[var(--admin-fg-muted)]'
                    }`}
                    >
                      {item.value}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </ChartCard>

        <ChartCard title={t('admin.ops.reservationStatus')}>
          {statusDistribution.length === 0 ? (
            <EmptyState title={t('admin.ops.noDistribution')} description={t('admin.ops.noDistributionHint')} />
          ) : (
            <div className="space-y-2.5">
              {statusDistribution.map((row) => {
                const max = Math.max(1, ...statusDistribution.map((r) => r.value))
                const pct = Math.round((row.value / max) * 100)
                return (
                  <div key={row.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--admin-fg-secondary)]">
                      {t(`admin.status.${row.key}`) !== `admin.status.${row.key}`
                        ? t(`admin.status.${row.key}`)
                        : row.label}
                    </span>
                      <span className="tabular-nums font-medium text-[var(--admin-fg)]">{row.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--admin-surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--admin-accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <ChartCard title={t('admin.dashboard.upcomingPickups')}>
          {(dash.upcomingPickups || []).length === 0 ? (
            <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.dashboard.noPickups')}</p>
          ) : (
            <div className="space-y-2">
              {(dash.upcomingPickups || []).map((b) => (
                <div key={b._id} className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.customerName || t('admin.common.guest')}</p>
                    <p className="text-[11px] text-[var(--admin-fg-muted)] truncate">
                      {b.car?.brand} {b.car?.model} · {new Date(b.pickupDate).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </ChartCard>
        <ChartCard title={t('admin.dashboard.upcomingReturnsTitle')}>
          {(dash.upcomingReturns || []).length === 0 ? (
            <p className="text-sm text-[var(--admin-fg-muted)]">{t('admin.dashboard.noReturns')}</p>
          ) : (
            <div className="space-y-2">
              {(dash.upcomingReturns || []).map((b) => (
                <div key={b._id} className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.customerName || t('admin.common.guest')}</p>
                    <p className="text-[11px] text-[var(--admin-fg-muted)] truncate">
                      {b.car?.brand} {b.car?.model} · {new Date(b.returnDate).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </AdminPage>
  )
}

export default Dashboard

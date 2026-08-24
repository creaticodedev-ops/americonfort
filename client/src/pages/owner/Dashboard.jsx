import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FleetRevenuePanel from '../../components/owner/FleetRevenuePanel'
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
  rangeForPeriod,
} from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

/**
 * Owner control center — deliberate information architecture:
 * 1) Pulse KPIs (few, non-duplicative)
 * 2) Attention queue (actionable only)
 * 3) Revenue by vehicle (decision engine for the fleet)
 * 4) Live operations (what’s next)
 *
 * Revenue / utilization for vehicles reuse /api/owner/vehicle-stats (no second logic).
 */
const Dashboard = () => {
  const { axios, isOwner, currency, hasPermission, hasFeature } = useAppContext()
  const { t } = useI18n()
  const [dash, setDash] = useState(null)
  const [fleetStats, setFleetStats] = useState(null)
  const [accounting, setAccounting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fleetLoading, setFleetLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [error, setError] = useState('')
  const [pendingSignatures, setPendingSignatures] = useState(null)

  const canAccounting = hasPermission('accounting') && hasFeature('accounting')
  const canSignatures = hasPermission('signature_requests') && hasFeature('signature_requests')
  const canFleet = hasPermission('fleet') && hasFeature('fleet')

  const accountingPeriod = period === 'year' ? 'year' : 'month'

  const load = async () => {
    if (!isOwner) return
    setLoading(true)
    setError('')
    try {
      const range = rangeForPeriod(period)
      const reqs = [
        axios.get('/api/owner/ops-dashboard'),
        canFleet
          ? axios.get('/api/owner/vehicle-stats', { params: { period, from: range.from, to: range.to } })
          : Promise.resolve(null),
        canAccounting
          ? axios.get(`/api/owner/accounting/overview?period=${accountingPeriod}`)
          : Promise.resolve(null),
        canSignatures
          ? axios.get('/api/owner/signature-requests?status=pending&limit=1')
          : Promise.resolve(null),
      ]
      setFleetLoading(Boolean(canFleet))
      const [ops, fleet, acc, sig] = await Promise.all(reqs)
      if (ops.data.success) setDash(ops.data.dashboard)
      else throw new Error(ops.data.message || t('admin.shell.loadError'))

      if (fleet?.data?.success) setFleetStats(fleet.data)
      else setFleetStats(null)
      setFleetLoading(false)

      if (acc?.data?.success) setAccounting(acc.data.overview)
      else setAccounting(null)

      if (sig?.data?.success) {
        setPendingSignatures(sig.data.pagination?.total ?? (sig.data.items?.length || 0))
      } else {
        setPendingSignatures(null)
      }
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      toast.error(msg)
      setFleetLoading(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, axios, canAccounting, canSignatures, canFleet, period])

  const money = (n) =>
    `${currency}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  const attentionItems = useMemo(() => {
    if (!dash) return []
    return [
      {
        key: 'pending',
        label: t('admin.ops.pendingReservations'),
        value: dash.pendingBookings || 0,
        to: '/owner/manage-bookings',
        show: true,
      },
      {
        key: 'overdue',
        label: t('admin.ops.overdueReturns'),
        value: dash.overdueCount || 0,
        to: '/owner/manage-bookings',
        show: true,
      },
      {
        key: 'signatures',
        label: t('admin.ops.pendingSignatures'),
        value: pendingSignatures || 0,
        to: '/owner/signature-requests',
        show: canSignatures,
      },
      {
        key: 'maintenance',
        label: t('admin.ops.vehiclesOffline'),
        value: dash.maintenanceVehicles || 0,
        to: '/owner/maintenance',
        show: hasPermission('maintenance'),
      },
    ].filter((item) => item.show && Number(item.value) > 0)
  }, [dash, pendingSignatures, canSignatures, hasPermission, t])

  const attentionTotal = attentionItems.reduce((s, i) => s + Number(i.value || 0), 0)

  const operationsFeed = useMemo(() => {
    if (!dash) return []
    const pickups = (dash.upcomingPickups || []).map((b) => ({
      ...b,
      kind: 'pickup',
      at: b.pickupDate,
    }))
    const returns = (dash.upcomingReturns || []).map((b) => ({
      ...b,
      kind: 'return',
      at: b.returnDate,
    }))
    return [...pickups, ...returns]
      .sort((a, b) => new Date(a.at) - new Date(b.at))
      .slice(0, 8)
  }, [dash])

  const fleetKpis = fleetStats?.kpis
  const periodRevenue = canAccounting
    ? (accounting?.kpis?.grossRevenue ?? fleetKpis?.totalRevenue ?? dash?.monthlyRevenue)
    : (fleetKpis?.totalRevenue ?? dash?.monthlyRevenue)

  if (loading) {
    return (
      <AdminPage>
        <PageHeader title={t('admin.dashboard.title')} description={t('admin.dashboard.subtitle')} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[6.5rem] rounded-[var(--admin-radius-lg)]" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-[var(--admin-radius-lg)] mt-4" />
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

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.dashboard.title')}
        description={t('admin.ops.controlCenterHint')}
        actions={
          <>
            <SegmentedControl
              className="admin-segment--premium"
              options={[
                { id: 'today', label: t('admin.ops.periodToday') },
                { id: 'week', label: t('admin.ops.periodWeek') },
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

      {/* 1. Pulse — four decisive KPIs only */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          compact
          label={t('admin.ops.revenue')}
          value={money(periodRevenue)}
          hint={t('admin.ops.revenuePeriodHint')}
          tone="success"
          to={canAccounting ? '/owner/accounting' : '/owner/analytics'}
        />
        {canAccounting ? (
          <StatCard
            compact
            label={t('admin.ops.netResult')}
            value={money(kpis.netResult)}
            hint={t('admin.ops.afterExpenses')}
            tone={Number(kpis.netResult) >= 0 ? 'success' : 'danger'}
            to="/owner/accounting"
          />
        ) : (
          <StatCard
            compact
            label={t('admin.ops.avgPerRental')}
            value={money(fleetKpis?.avgRentalValue ?? 0)}
            hint={t('admin.ops.avgPerRentalHint')}
            tone="info"
          />
        )}
        <StatCard
          compact
          label={t('admin.ops.onRent')}
          value={fleetKpis?.rented ?? dash.rentedVehicles}
          hint={`${t('admin.ops.available')}: ${fleetKpis?.available ?? dash.availableVehicles} · ${t('admin.ops.totalFleet')}: ${fleetKpis?.vehicles ?? dash.totalCars}`}
          tone="info"
          to="/owner/manage-cars"
        />
        <StatCard
          compact
          label={t('admin.ops.needsAttention')}
          value={attentionTotal}
          hint={attentionTotal ? t('admin.ops.needsAttentionHint') : t('admin.ops.allClear')}
          tone={attentionTotal ? 'warning' : 'default'}
          to={attentionTotal ? attentionItems[0]?.to : undefined}
        />
      </div>

      {/* 2. Attention queue — only when something needs action */}
      {attentionItems.length > 0 && (
        <div className="admin-attention mt-4" role="region" aria-label={t('admin.ops.needsAttention')}>
          <p className="admin-attention__label">{t('admin.ops.needsAttention')}</p>
          <div className="admin-attention__chips">
            {attentionItems.map((item) => (
              <Link key={item.key} to={item.to} className="admin-attention__chip">
                <span className="admin-attention__chip-count tabular-nums">{item.value}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 3. Revenue by vehicle — primary decision surface */}
      <ChartCard
        className="mt-4"
        title={t('admin.ops.fleetRevenueTitle')}
        action={
          canFleet ? (
            <Link to="/owner/vehicle-stats" className="text-xs font-medium text-[var(--admin-accent)]">
              {t('admin.ops.viewFleetStats')}
            </Link>
          ) : null
        }
      >
        {canFleet ? (
          <FleetRevenuePanel
            vehicles={fleetStats?.vehicles || []}
            kpis={fleetKpis}
            currency={currency}
            loading={fleetLoading}
            limit={8}
          />
        ) : (
          <EmptyState
            title={t('admin.ops.fleetRevLocked')}
            description={t('admin.ops.fleetRevLockedHint')}
          />
        )}
      </ChartCard>

      {/* 4. Live operations — recent + upcoming in one place */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
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
                  {(dash.recentBookings || []).slice(0, 5).map((b) => (
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

        <ChartCard
          title={t('admin.ops.upcomingOps')}
          action={
            hasPermission('calendar') ? (
              <Link to="/owner/calendar" className="text-xs font-medium text-[var(--admin-accent)]">
                {t('admin.ops.viewCalendar')}
              </Link>
            ) : null
          }
        >
          {operationsFeed.length === 0 ? (
            <p className="text-sm text-[var(--admin-fg-muted)] py-4">{t('admin.ops.noUpcomingOps')}</p>
          ) : (
            <ul className="space-y-2">
              {operationsFeed.map((b) => (
                <li
                  key={`${b.kind}-${b._id}`}
                  className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`admin-ops-kind is-${b.kind}`}>
                        {b.kind === 'pickup' ? t('admin.ops.kindPickup') : t('admin.ops.kindReturn')}
                      </span>
                      <p className="text-sm font-medium truncate">{b.customerName || t('admin.common.guest')}</p>
                    </div>
                    <p className="text-[11px] text-[var(--admin-fg-muted)] truncate mt-0.5">
                      {b.car?.brand} {b.car?.model} · {new Date(b.at).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </AdminPage>
  )
}

export default Dashboard

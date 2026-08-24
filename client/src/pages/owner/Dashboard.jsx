import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FleetRevenuePanel from '../../components/owner/FleetRevenuePanel'
import {
  AdminPage,
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

const formatWhen = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Premium control-center dashboard.
 * Hierarchy: one hero number → optional alerts → fleet ranking → quiet activity.
 * Vehicle money uses /api/owner/vehicle-stats (shared with Fleet Statistics).
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
  const [showAllVehicles, setShowAllVehicles] = useState(false)

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
      setFleetLoading(Boolean(canFleet))
      const [ops, fleet, acc, sig] = await Promise.all([
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
      ])

      if (ops.data.success) setDash(ops.data.dashboard)
      else throw new Error(ops.data.message || t('admin.shell.loadError'))

      setFleetStats(fleet?.data?.success ? fleet.data : null)
      setAccounting(acc?.data?.success ? acc.data.overview : null)
      setPendingSignatures(
        sig?.data?.success
          ? (sig.data.pagination?.total ?? (sig.data.items?.length || 0))
          : null,
      )
    } catch (err) {
      const msg = getErrorMessage(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setFleetLoading(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    setShowAllVehicles(false)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, axios, canAccounting, canSignatures, canFleet, period])

  const money = (n) =>
    `${currency}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  const attentionItems = useMemo(() => {
    if (!dash) return []
    return [
      {
        key: 'overdue',
        label: t('admin.ops.overdueReturns'),
        value: dash.overdueCount || 0,
        to: '/owner/manage-bookings',
        show: true,
      },
      {
        key: 'pending',
        label: t('admin.ops.pendingReservations'),
        value: dash.pendingBookings || 0,
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

  const activity = useMemo(() => {
    if (!dash) return []
    const upcoming = [
      ...(dash.upcomingPickups || []).map((b) => ({
        id: `p-${b._id}`,
        kind: 'pickup',
        name: b.customerName,
        vehicle: [b.car?.brand, b.car?.model].filter(Boolean).join(' '),
        at: b.pickupDate,
        href: '/owner/manage-bookings',
      })),
      ...(dash.upcomingReturns || []).map((b) => ({
        id: `r-${b._id}`,
        kind: 'return',
        name: b.customerName,
        vehicle: [b.car?.brand, b.car?.model].filter(Boolean).join(' '),
        at: b.returnDate,
        href: '/owner/manage-bookings',
      })),
    ]
      .sort((a, b) => new Date(a.at) - new Date(b.at))
      .slice(0, 4)

    const recent = (dash.recentBookings || []).slice(0, 4).map((b) => ({
      id: `b-${b._id}`,
      kind: 'booking',
      name: b.customerName,
      vehicle: [b.car?.brand, b.car?.model].filter(Boolean).join(' '),
      at: b.createdAt || b.pickupDate,
      amount: b.price,
      status: b.status,
      href: '/owner/manage-bookings',
    }))

    return { upcoming, recent }
  }, [dash])

  const fleetKpis = fleetStats?.kpis
  const periodRevenue = canAccounting
    ? (accounting?.kpis?.grossRevenue ?? fleetKpis?.totalRevenue ?? dash?.monthlyRevenue)
    : (fleetKpis?.totalRevenue ?? dash?.monthlyRevenue)
  const netResult = accounting?.kpis?.netResult
  const onRent = fleetKpis?.rented ?? dash?.rentedVehicles ?? 0
  const available = fleetKpis?.available ?? dash?.availableVehicles ?? 0
  const fleetSize = fleetKpis?.vehicles ?? dash?.totalCars ?? 0
  const util = fleetKpis?.fleetUtilization
  const avgRental = fleetKpis?.avgRentalValue
  const vehicleLimit = showAllVehicles ? 12 : 5

  const periodLabel = {
    today: t('admin.ops.periodToday'),
    week: t('admin.ops.periodWeek'),
    month: t('admin.ops.periodMonth'),
    year: t('admin.ops.periodYear'),
  }[period]

  if (loading) {
    return (
      <AdminPage className="admin-pulse-page">
        <div className="admin-pulse-skel">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="mt-8 h-16 w-72 rounded-md" />
          <Skeleton className="mt-10 h-64 w-full rounded-2xl" />
        </div>
      </AdminPage>
    )
  }

  if (error && !dash) {
    return (
      <AdminPage className="admin-pulse-page">
        <ErrorState title={t('admin.shell.loadError')} description={error} onRetry={load} />
      </AdminPage>
    )
  }

  if (!dash) return null

  return (
    <AdminPage className="admin-pulse-page">
      {/* Quiet toolbar */}
      <header className="admin-pulse-top">
        <div className="min-w-0">
          <p className="admin-pulse-kicker">{t('admin.dashboard.title')}</p>
          <h1 className="admin-pulse-heading">{t('admin.ops.pulseHeadline')}</h1>
        </div>
        <div className="admin-pulse-top-actions">
          <SegmentedControl
            className="admin-segment--quiet"
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
          <Link to="/owner/manage-bookings" className="admin-pulse-link">
            {t('admin.ops.reservations')}
          </Link>
        </div>
      </header>

      {/* Hero — one primary number */}
      <section className="admin-pulse-hero admin-pulse-enter" aria-labelledby="pulse-revenue">
        <p className="admin-pulse-hero-label" id="pulse-revenue">
          {t('admin.ops.revenue')} · {periodLabel}
        </p>
        <p className="admin-pulse-hero-value tabular-nums">{money(periodRevenue)}</p>
        <div className="admin-pulse-meta">
          {canAccounting && netResult != null ? (
            <Link to="/owner/accounting" className="admin-pulse-meta-item">
              <span>{t('admin.ops.netResult')}</span>
              <strong className="tabular-nums">{money(netResult)}</strong>
            </Link>
          ) : avgRental != null ? (
            <span className="admin-pulse-meta-item">
              <span>{t('admin.ops.avgPerRental')}</span>
              <strong className="tabular-nums">{money(avgRental)}</strong>
            </span>
          ) : null}
          <Link to="/owner/manage-cars" className="admin-pulse-meta-item">
            <span>{t('admin.ops.onRent')}</span>
            <strong className="tabular-nums">
              {onRent}
              <em> / {fleetSize}</em>
            </strong>
          </Link>
          {util != null ? (
            <span className="admin-pulse-meta-item">
              <span>{t('admin.ops.utilization')}</span>
              <strong className="tabular-nums">{util}%</strong>
            </span>
          ) : (
            <span className="admin-pulse-meta-item">
              <span>{t('admin.ops.available')}</span>
              <strong className="tabular-nums">{available}</strong>
            </span>
          )}
        </div>

        {attentionItems.length > 0 && (
          <div className="admin-pulse-alerts" role="status">
            {attentionItems.map((item) => (
              <Link key={item.key} to={item.to} className="admin-pulse-alert">
                <strong className="tabular-nums">{item.value}</strong>
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Fleet ranking — progressive disclosure */}
      <section className="admin-pulse-section admin-pulse-enter admin-pulse-enter--2">
        <div className="admin-pulse-section-head">
          <div>
            <h2 className="admin-pulse-section-title">{t('admin.ops.fleetRevenueTitle')}</h2>
            <p className="admin-pulse-section-desc">{t('admin.ops.fleetRevenueDesc')}</p>
          </div>
          {canFleet ? (
            <Link to="/owner/vehicle-stats" className="admin-pulse-link">
              {t('admin.ops.viewFleetStats')}
            </Link>
          ) : null}
        </div>

        {canFleet ? (
          <>
            <FleetRevenuePanel
              vehicles={fleetStats?.vehicles || []}
              currency={currency}
              loading={fleetLoading}
              limit={vehicleLimit}
            />
            {(fleetStats?.vehicles?.length || 0) > 5 && (
              <div className="admin-pulse-more">
                <button
                  type="button"
                  className="admin-pulse-more-btn"
                  onClick={() => setShowAllVehicles((v) => !v)}
                >
                  {showAllVehicles
                    ? t('admin.ops.showLessVehicles')
                    : t('admin.ops.showMoreVehicles', { count: Math.min(12, fleetStats.vehicles.length) })}
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title={t('admin.ops.fleetRevLocked')}
            description={t('admin.ops.fleetRevLockedHint')}
          />
        )}
      </section>

      {/* Activity — quiet dual list, no card chrome */}
      <section className="admin-pulse-activity admin-pulse-enter admin-pulse-enter--3">
        <div className="admin-pulse-activity-col">
          <div className="admin-pulse-section-head">
            <h2 className="admin-pulse-section-title">{t('admin.ops.upcomingOps')}</h2>
            {hasPermission('calendar') ? (
              <Link to="/owner/calendar" className="admin-pulse-link">{t('admin.ops.viewCalendar')}</Link>
            ) : null}
          </div>
          {activity.upcoming.length === 0 ? (
            <p className="admin-pulse-empty">{t('admin.ops.noUpcomingOps')}</p>
          ) : (
            <ul className="admin-pulse-list">
              {activity.upcoming.map((row) => (
                <li key={row.id}>
                  <Link to={row.href} className="admin-pulse-row">
                    <span className={`admin-pulse-dot is-${row.kind}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="admin-pulse-row-title truncate">
                        {row.name || t('admin.common.guest')}
                      </span>
                      <span className="admin-pulse-row-sub truncate">
                        {row.kind === 'pickup' ? t('admin.ops.kindPickup') : t('admin.ops.kindReturn')}
                        {row.vehicle ? ` · ${row.vehicle}` : ''}
                      </span>
                    </span>
                    <time className="admin-pulse-row-time">{formatWhen(row.at)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-pulse-activity-col">
          <div className="admin-pulse-section-head">
            <h2 className="admin-pulse-section-title">{t('admin.ops.recentReservations')}</h2>
            <Link to="/owner/manage-bookings" className="admin-pulse-link">{t('admin.ops.viewAll')}</Link>
          </div>
          {activity.recent.length === 0 ? (
            <p className="admin-pulse-empty">{t('admin.ops.noRecent')}</p>
          ) : (
            <ul className="admin-pulse-list">
              {activity.recent.map((row) => (
                <li key={row.id}>
                  <Link to={row.href} className="admin-pulse-row">
                    <span className="min-w-0 flex-1">
                      <span className="admin-pulse-row-title truncate">
                        {row.name || t('admin.common.guest')}
                      </span>
                      <span className="admin-pulse-row-sub truncate">
                        {row.vehicle || '—'}
                      </span>
                    </span>
                    <span className="admin-pulse-row-amount tabular-nums">{money(row.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AdminPage>
  )
}

export default Dashboard

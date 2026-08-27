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
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Owner operations dashboard — premium composition, real data only.
 * Fleet revenue from /api/owner/vehicle-stats (shared with Vehicle Statistics).
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
  const [expandedFleet, setExpandedFleet] = useState(false)

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

      if (!ops.data.success) throw new Error(ops.data.message || t('admin.shell.loadError'))
      setDash(ops.data.dashboard)
      setFleetStats(fleet?.data?.success ? fleet.data : null)
      setAccounting(acc?.data?.success ? acc.data.overview : null)
      setPendingSignatures(
        sig?.data?.success
          ? (sig.data.pagination?.total ?? sig.data.items?.length ?? 0)
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
    setExpandedFleet(false)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, axios, canAccounting, canSignatures, canFleet, period])

  const money = (n) =>
    `${currency}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  const periodLabel = {
    today: t('admin.ops.periodToday'),
    week: t('admin.ops.periodWeek'),
    month: t('admin.ops.periodMonth'),
    year: t('admin.ops.periodYear'),
  }[period]

  const attentionItems = useMemo(() => {
    if (!dash) return []
    return [
      { key: 'overdue', label: t('admin.ops.overdueReturns'), value: dash.overdueCount || 0, to: '/owner/manage-bookings', show: true },
      { key: 'pending', label: t('admin.ops.pendingReservations'), value: dash.pendingBookings || 0, to: '/owner/manage-bookings', show: true },
      { key: 'signatures', label: t('admin.ops.pendingSignatures'), value: pendingSignatures || 0, to: '/owner/signature-requests', show: canSignatures },
      { key: 'maintenance', label: t('admin.ops.vehiclesOffline'), value: dash.maintenanceVehicles || 0, to: '/owner/maintenance', show: hasPermission('maintenance') },
    ].filter((i) => i.show && Number(i.value) > 0)
  }, [dash, pendingSignatures, canSignatures, hasPermission, t])

  const upcoming = useMemo(() => {
    if (!dash) return []
    return [
      ...(dash.upcomingPickups || []).map((b) => ({
        id: `p-${b._id}`,
        kind: 'pickup',
        name: b.customerName,
        vehicle: [b.car?.brand, b.car?.model].filter(Boolean).join(' '),
        at: b.pickupDate,
      })),
      ...(dash.upcomingReturns || []).map((b) => ({
        id: `r-${b._id}`,
        kind: 'return',
        name: b.customerName,
        vehicle: [b.car?.brand, b.car?.model].filter(Boolean).join(' '),
        at: b.returnDate,
      })),
    ]
      .sort((a, b) => new Date(a.at) - new Date(b.at))
      .slice(0, 5)
  }, [dash])

  const recent = useMemo(
    () => (dash?.recentBookings || []).slice(0, 5),
    [dash],
  )

  const fleetKpis = fleetStats?.kpis
  // Period revenue KPIs always come from vehicle-stats (overlap-prorated) so they match
  // the fleet ranking below. Accounting gross uses createdAt + full price and must not
  // override the hero when a period filter is selected.
  const periodRevenue = fleetKpis?.totalRevenue ?? dash?.monthlyRevenue
  const netResult = accounting?.kpis?.netResult
  const onRent = fleetKpis?.rented ?? dash?.rentedVehicles ?? 0
  const fleetSize = fleetKpis?.vehicles ?? dash?.totalCars ?? 0
  const util = fleetKpis?.fleetUtilization
  const avgRental = fleetKpis?.avgRentalValue
  const rentals = fleetKpis?.revenueRentals ?? fleetKpis?.totalRentals
  const vehicleLimit = expandedFleet ? 10 : 5
  const shareBars = useMemo(() => {
    const list = [...(fleetStats?.vehicles || [])]
      .sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0))
      .slice(0, 8)
    const max = Math.max(1, ...list.map((v) => Number(v.revenue) || 0))
    return list.map((v) => ({
      id: v._id,
      pct: Math.max(10, Math.round(((Number(v.revenue) || 0) / max) * 100)),
      label: [v.brand, v.model].filter(Boolean).join(' '),
    }))
  }, [fleetStats])

  if (loading) {
    return (
      <AdminPage>
        <div className="admin-dash">
          <Skeleton className="h-12 w-72 rounded-xl" />
          <Skeleton className="mt-6 h-56 w-full rounded-[1.25rem]" />
          <div className="mt-5 grid gap-5 lg:grid-cols-5">
            <Skeleton className="h-[22rem] rounded-[1.25rem] lg:col-span-3" />
            <div className="grid gap-5 lg:col-span-2">
              <Skeleton className="h-44 rounded-[1.25rem]" />
              <Skeleton className="h-44 rounded-[1.25rem]" />
            </div>
          </div>
        </div>
      </AdminPage>
    )
  }

  if (error && !dash) {
    return (
      <AdminPage>
        <ErrorState title={t('admin.shell.loadError')} description={error} onRetry={load} />
      </AdminPage>
    )
  }

  if (!dash) return null

  return (
    <AdminPage>
      <div className="admin-dash">
        <header className="admin-dash__header">
          <div className="min-w-0">
            <p className="admin-dash__kicker">{t('admin.ops.operationsDashboard')}</p>
            <h1 className="admin-dash__title">{t('admin.ops.pulseHeadline')}</h1>
            <p className="admin-dash__subtitle">{t('admin.ops.dashSubtitle')}</p>
          </div>
          <div className="admin-dash__header-actions">
            <SegmentedControl
              className="admin-segment--dash"
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
            <Link to="/owner/manage-bookings" className="admin-btn admin-btn--primary admin-btn--sm">
              {t('admin.ops.reservations')}
            </Link>
          </div>
        </header>

        <section className="admin-dash__hero admin-dash-enter">
          <div className="admin-dash__hero-top">
            <div className="admin-dash__hero-main">
              <p className="admin-dash__eyebrow">
                {t('admin.ops.revenue')}
                <span className="admin-dash__eyebrow-sep" aria-hidden>
                  ·
                </span>
                {periodLabel}
              </p>
              <p className="admin-dash__hero-value tabular-nums">{money(periodRevenue)}</p>
              {(rentals != null || avgRental != null) && (
                <p className="admin-dash__hero-hint">
                  {rentals != null ? t('admin.ops.earningsRentals', { count: rentals }) : null}
                  {rentals != null && avgRental != null ? (
                    <span className="admin-dash__hint-sep" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  {avgRental != null ? `${t('admin.ops.avgPerRental')} ${money(avgRental)}` : null}
                </p>
              )}
            </div>

            {shareBars.length > 0 && (
              <div className="admin-dash__spark" aria-hidden title={t('admin.ops.fleetRevenueTitle')}>
                {shareBars.map((bar) => (
                  <span
                    key={bar.id}
                    className="admin-dash__spark-bar"
                    style={{ height: `${bar.pct}%` }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="admin-dash__kpi-row">
            {canAccounting && netResult != null ? (
              <Link to="/owner/accounting" className="admin-dash__kpi">
                <span className="admin-dash__kpi-label">{t('admin.ops.netResult')}</span>
                <span className="admin-dash__kpi-value tabular-nums">{money(netResult)}</span>
                <span className="admin-dash__kpi-hint">{t('admin.ops.afterExpenses')}</span>
              </Link>
            ) : (
              <div className="admin-dash__kpi">
                <span className="admin-dash__kpi-label">{t('admin.ops.avgPerRental')}</span>
                <span className="admin-dash__kpi-value tabular-nums">
                  {avgRental != null ? money(avgRental) : '—'}
                </span>
                <span className="admin-dash__kpi-hint">{t('admin.ops.avgPerRentalHint')}</span>
              </div>
            )}

            <Link to="/owner/manage-cars" className="admin-dash__kpi">
              <span className="admin-dash__kpi-label">{t('admin.ops.onRent')}</span>
              <span className="admin-dash__kpi-value tabular-nums">
                {onRent}
                <span className="admin-dash__kpi-slash">/{fleetSize}</span>
              </span>
              <span className="admin-dash__kpi-hint">{t('admin.ops.currentlyOnRent')}</span>
            </Link>

            <div className="admin-dash__kpi">
              <span className="admin-dash__kpi-label">{t('admin.ops.utilization')}</span>
              <span className="admin-dash__kpi-value tabular-nums">
                {util != null ? `${util}%` : '—'}
              </span>
              <div className="admin-dash__util-track" aria-hidden>
                <span
                  className="admin-dash__util-fill"
                  style={{ width: `${Math.min(100, Math.max(0, Number(util) || 0))}%` }}
                />
              </div>
              <span className="admin-dash__kpi-hint">{t('admin.dashboard.fleetUtilSub')}</span>
            </div>
          </div>

          {attentionItems.length > 0 && (
            <div className="admin-dash__alerts">
              {attentionItems.map((item) => (
                <Link key={item.key} to={item.to} className="admin-dash__alert">
                  <span className="admin-dash__alert-count tabular-nums">{item.value}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="admin-dash__grid admin-dash-enter admin-dash-enter--2">
          <section className="admin-dash__panel admin-dash__panel--fleet">
            <div className="admin-dash__panel-head">
              <div>
                <h2 className="admin-dash__panel-title">{t('admin.ops.fleetRevenueTitle')}</h2>
                <p className="admin-dash__panel-desc">{t('admin.ops.fleetRevenueDesc')}</p>
              </div>
              {canFleet && (
                <Link to="/owner/vehicle-stats" className="admin-dash__text-link">
                  {t('admin.ops.viewFleetStats')}
                </Link>
              )}
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
                  <button
                    type="button"
                    className="admin-dash__expand"
                    onClick={() => setExpandedFleet((v) => !v)}
                  >
                    {expandedFleet
                      ? t('admin.ops.showLessVehicles')
                      : t('admin.ops.showMoreVehicles')}
                  </button>
                )}
              </>
            ) : (
              <EmptyState
                title={t('admin.ops.fleetRevLocked')}
                description={t('admin.ops.fleetRevLockedHint')}
              />
            )}
          </section>

          <aside className="admin-dash__aside">
            <section className="admin-dash__panel">
              <div className="admin-dash__panel-head">
                <h2 className="admin-dash__panel-title">{t('admin.ops.upcomingOps')}</h2>
                {hasPermission('calendar') && (
                  <Link to="/owner/calendar" className="admin-dash__text-link">
                    {t('admin.ops.viewCalendar')}
                  </Link>
                )}
              </div>
              {upcoming.length === 0 ? (
                <p className="admin-dash__empty">{t('admin.ops.noUpcomingOps')}</p>
              ) : (
                <ul className="admin-dash__feed">
                  {upcoming.map((row) => (
                    <li key={row.id}>
                      <Link to="/owner/manage-bookings" className="admin-dash__feed-row">
                        <span className={`admin-dash__kind is-${row.kind}`}>
                          {row.kind === 'pickup' ? t('admin.ops.kindPickup') : t('admin.ops.kindReturn')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="admin-dash__feed-title truncate">
                            {row.name || t('admin.common.guest')}
                          </span>
                          <span className="admin-dash__feed-sub truncate">
                            {row.vehicle || '—'}
                          </span>
                        </span>
                        <time className="admin-dash__feed-meta">{formatWhen(row.at)}</time>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-dash__panel">
              <div className="admin-dash__panel-head">
                <h2 className="admin-dash__panel-title">{t('admin.ops.recentReservations')}</h2>
                <Link to="/owner/manage-bookings" className="admin-dash__text-link">
                  {t('admin.ops.viewAll')}
                </Link>
              </div>
              {recent.length === 0 ? (
                <p className="admin-dash__empty">{t('admin.ops.noRecent')}</p>
              ) : (
                <ul className="admin-dash__feed">
                  {recent.map((b) => (
                    <li key={b._id}>
                      <Link to="/owner/manage-bookings" className="admin-dash__feed-row">
                        <span className="min-w-0 flex-1">
                          <span className="admin-dash__feed-title truncate">
                            {b.customerName || t('admin.common.guest')}
                          </span>
                          <span className="admin-dash__feed-sub truncate">
                            {[b.car?.brand, b.car?.model].filter(Boolean).join(' ') || '—'}
                          </span>
                        </span>
                        <span className="admin-dash__feed-amount tabular-nums">{money(b.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </AdminPage>
  )
}

export default Dashboard

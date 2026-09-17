import React, { useEffect, useMemo, useState } from 'react'
import {
  AdminModal,
  AnalyticsPeriodBar,
  EmptyState,
  SegmentedControl,
  Skeleton,
  formatAnalyticsDate,
  rangeForPeriod,
} from './ui'
import StatusBadge from './StatusBadge'
import RevenueChart from './RevenueChart'
import DataTable from './DataTable'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import toast from 'react-hot-toast'
import { assets } from '../../assets/ownerAssets'

const money = (value, currency) => {
  const code = String(currency || 'MAD').replace(/\s+/g, '') || 'MAD'
  const formatted = Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })
  return `${formatted} ${code}`
}

const formatDay = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const availabilityLabel = (availability, t) => {
  if (availability === 'rented') return t('admin.vehicleStats.statusRented')
  if (availability === 'maintenance') return t('admin.vehicleStats.statusMaintenance')
  if (availability === 'offline') return t('admin.vehicleStats.statusOffline')
  return t('admin.vehicleStats.statusAvailable')
}

const statusTone = (availability) => {
  if (availability === 'rented') return 'active'
  if (availability === 'maintenance') return 'maintenance'
  if (availability === 'offline') return 'inactive'
  return 'confirmed'
}

const displayName = (vehicle, stats) => {
  const brand = vehicle?.brand || stats?.vehicle?.brand || ''
  const model = vehicle?.model || stats?.vehicle?.model || ''
  return [brand, model].filter(Boolean).join(' – ')
}

/**
 * Per-vehicle analytics drawer.
 * Owns its own period filter (initialized from the fleet page) so the owner can
 * explore this physical vehicle without fighting the list filter.
 */
const VehicleStatsDrawer = ({
  vehicle,
  open,
  onClose,
  period: parentPeriod = 'month',
  from: parentFrom,
  to: parentTo,
  onPeriodChange,
}) => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [grain, setGrain] = useState('')
  const fallback = rangeForPeriod('month')
  const [period, setPeriod] = useState(parentPeriod || 'month')
  const [from, setFrom] = useState(parentFrom || fallback.from)
  const [to, setTo] = useState(parentTo || fallback.to)

  const carId = vehicle?._id

  useEffect(() => {
    if (!open) return
    const next = rangeForPeriod(parentPeriod || 'month')
    setPeriod(parentPeriod || 'month')
    setFrom(parentFrom || next.from)
    setTo(parentTo || next.to)
    setGrain('')
  }, [open, carId, parentPeriod, parentFrom, parentTo])

  useEffect(() => {
    if (!open || !carId || !from || !to) {
      setStats(null)
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = { period, from, to }
        if (grain) params.grain = grain
        const { data } = await axios.get(`/api/owner/vehicles/${carId}/stats`, { params })
        if (!cancelled) {
          if (data.success) {
            setStats(data.stats)
            if (!grain && data.stats?.period?.grain) setGrain(data.stats.period.grain)
          } else {
            toast.error(data.message || t('admin.vehicleStats.loadError'))
          }
        }
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 120)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [axios, carId, from, grain, open, period, t, to])

  useEffect(() => {
    if (!open) {
      setStats(null)
      setGrain('')
    }
  }, [open])

  const handlePeriodChange = ({ period: nextPeriod, from: nextFrom, to: nextTo }) => {
    setPeriod(nextPeriod)
    setFrom(nextFrom)
    setTo(nextTo)
    setGrain('')
    onPeriodChange?.({ period: nextPeriod, from: nextFrom, to: nextTo })
  }

  const overview = stats?.overview || {}
  const history = stats?.rentalHistory || []
  const trend = stats?.trend || []
  const maintenance = stats?.maintenanceHistory || []
  const name = displayName(vehicle, stats)
  const fleetId = vehicle?.fleetId || stats?.vehicle?.fleetId || ''
  const plate = vehicle?.licensePlate || stats?.vehicle?.licensePlate || ''
  const availability = overview.availability || stats?.vehicle?.availability || 'available'
  const metaLine = [fleetId, plate].filter(Boolean).join(' · ')

  const grainOptions = useMemo(
    () => [
      { id: 'daily', label: t('admin.vehicleStats.grainDaily') },
      { id: 'weekly', label: t('admin.vehicleStats.grainWeekly') },
      { id: 'monthly', label: t('admin.vehicleStats.grainMonthly') },
    ],
    [t],
  )

  const periodCaption = `${formatAnalyticsDate(from)} → ${formatAnalyticsDate(to)}`
  const utilPct =
    overview.utilization != null && overview.utilization !== ''
      ? Number(overview.utilization)
      : Number(String(overview.utilizationRate || '0').replace('%', ''))
  const utilDisplay = Number.isFinite(utilPct)
    ? `${Number.isInteger(utilPct) ? utilPct : utilPct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`
    : overview.utilizationRate || '0%'
  const avgDays =
    overview.avgDuration != null
      ? overview.avgDuration
      : Number(String(overview.averageRentalDuration || '').replace(/[^\d.]/g, '')) || 0

  const revenueHint =
    overview.bookingValue != null && overview.bookingValue !== overview.totalRevenue
      ? t('admin.vehicleStats.periodRevenueHint', {
          booking: money(overview.bookingValue, currency),
        })
      : t('admin.vehicleStats.kpiRevenueHint')

  const pipeline = [
    {
      id: 'completed',
      label: t('admin.vehicleStats.completed'),
      value: overview.completedBookings ?? 0,
      tone: 'neutral',
    },
    {
      id: 'active',
      label: t('admin.vehicleStats.activeNow'),
      value: overview.activeBookings ?? 0,
      tone: 'live',
      hint: t('admin.vehicleStats.liveTag'),
    },
    {
      id: 'upcoming',
      label: t('admin.vehicleStats.upcoming'),
      value: overview.upcomingBookings ?? 0,
      tone: 'neutral',
    },
    {
      id: 'cancelled',
      label: t('admin.vehicleStats.cancelled'),
      value: overview.cancelledBookings ?? 0,
      tone: 'muted',
    },
  ]

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      size="xl"
      variant="drawer"
      headerVariant="bare"
      title={name || t('admin.vehicleStats.title')}
    >
      <div className="admin-vperf">
        <header className="admin-vperf__identity">
          <div className="admin-vperf__photo-wrap">
            <img
              src={vehicle?.image || stats?.vehicle?.image || assets.car_image1}
              alt={name}
              className="admin-vperf__photo"
            />
          </div>
          <div className="admin-vperf__identity-body">
            <div className="admin-vperf__identity-top">
              <h2 className="admin-vperf__name">{name || '—'}</h2>
              <StatusBadge
                status={statusTone(availability)}
                label={availabilityLabel(availability, t)}
              />
            </div>
            <p className="admin-vperf__meta">{metaLine || '—'}</p>
            <p className="admin-vperf__scope">{t('admin.vehicleStats.vehicleScopeHint')}</p>
          </div>
        </header>

        <AnalyticsPeriodBar period={period} from={from} to={to} onChange={handlePeriodChange} />

        {loading && !stats ? (
          <div className="admin-vperf__skeletons">
            <Skeleton className="h-28 w-full rounded-[var(--admin-radius)]" />
            <Skeleton className="h-48 w-full rounded-[var(--admin-radius)]" />
          </div>
        ) : !stats ? (
          <EmptyState title={t('admin.vehicleStats.none')} />
        ) : (
          <>
            <section className="admin-vperf__panel" aria-label={t('admin.vehicleStats.performanceTitle')}>
              <div className="admin-vperf__panel-head">
                <p className="admin-vperf__eyebrow">{t('admin.vehicleStats.performanceTitle')}</p>
                <p className="admin-vperf__period">
                  {t('admin.vehicleStats.periodHint', { days: stats.period?.days || 0 })}
                  <span className="admin-vperf__dot" aria-hidden>
                    ·
                  </span>
                  <span className="tabular-nums">{periodCaption}</span>
                </p>
              </div>

              <div className="admin-vperf__hero">
                <div className="admin-vperf__focal">
                  <p className="admin-vperf__label">{t('admin.vehicleStats.revenue')}</p>
                  <p className="admin-vperf__focal-value tabular-nums">
                    {money(overview.totalRevenue, currency)}
                  </p>
                  <p className="admin-vperf__hint">{revenueHint}</p>
                </div>
                <div className="admin-vperf__util">
                  <p className="admin-vperf__label">{t('admin.vehicleStats.utilization')}</p>
                  <p className="admin-vperf__util-value tabular-nums">{utilDisplay}</p>
                  <div className="admin-vperf__util-track" aria-hidden>
                    <div
                      className="admin-vperf__util-fill"
                      style={{ width: `${Math.min(100, Math.max(0, utilPct || 0))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-vperf__cluster" role="list">
                <div className="admin-vperf__cluster-item" role="listitem">
                  <span className="admin-vperf__cluster-value tabular-nums">
                    {overview.totalBookings ?? 0}
                  </span>
                  <span className="admin-vperf__cluster-label">{t('admin.vehicleStats.rentals')}</span>
                </div>
                <div className="admin-vperf__cluster-item" role="listitem">
                  <span className="admin-vperf__cluster-value tabular-nums">
                    {overview.rentalDays ?? 0}
                  </span>
                  <span className="admin-vperf__cluster-label">{t('admin.vehicleStats.rentalDays')}</span>
                </div>
                <div className="admin-vperf__cluster-item" role="listitem">
                  <span className="admin-vperf__cluster-value tabular-nums">
                    {avgDays}
                    <span className="admin-vperf__cluster-unit">
                      {t('admin.vehicleStats.daysUnit')}
                    </span>
                  </span>
                  <span className="admin-vperf__cluster-label">{t('admin.vehicleStats.averageRental')}</span>
                </div>
                <div className="admin-vperf__cluster-item" role="listitem">
                  <span className="admin-vperf__cluster-value tabular-nums">
                    {money(overview.averageRevenuePerBooking, currency)}
                  </span>
                  <span className="admin-vperf__cluster-label">
                    {t('admin.vehicleStats.avgRevenuePerRental')}
                  </span>
                </div>
              </div>

              <div className="admin-vperf__pipeline" aria-label={t('admin.vehicleStats.pipelineTitle')}>
                {pipeline.map((item) => (
                  <div
                    key={item.id}
                    className={`admin-vperf__pipe admin-vperf__pipe--${item.tone}${
                      item.value > 0 ? ' is-active' : ''
                    }`}
                  >
                    <span className="admin-vperf__pipe-value tabular-nums">{item.value}</span>
                    <span className="admin-vperf__pipe-label">
                      {item.label}
                      {item.hint && item.value > 0 ? (
                        <span className="admin-vperf__pipe-live">{item.hint}</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>

              <div className="admin-vperf__activity">
                <div className="admin-vperf__section-head">
                  <h3 className="admin-vperf__section-title">
                    {t('admin.vehicleStats.activityTitle')}
                  </h3>
                  <span className="admin-vperf__live">{t('admin.vehicleStats.liveTag')}</span>
                </div>
                <p className="admin-vperf__section-hint">{t('admin.vehicleStats.activityLiveHint')}</p>
                <dl className="admin-vperf__activity-grid">
                  <div className="admin-vperf__activity-item">
                    <dt>{t('admin.vehicleStats.currentRental')}</dt>
                    {overview.currentlyRented ? (
                      <dd>
                        <span className="admin-vperf__activity-main">
                          {overview.currentCustomer || '—'}
                        </span>
                        <span className="admin-vperf__activity-sub">
                          {formatDay(overview.currentPickupAt)} → {formatDay(overview.currentReturnAt)}
                        </span>
                      </dd>
                    ) : (
                      <dd className="admin-vperf__activity-empty">—</dd>
                    )}
                  </div>
                  <div className="admin-vperf__activity-item">
                    <dt>{t('admin.vehicleStats.nextReservation')}</dt>
                    {overview.nextReservationAt ? (
                      <dd>
                        <span className="admin-vperf__activity-main">
                          {overview.nextCustomer || '—'}
                        </span>
                        <span className="admin-vperf__activity-sub">
                          {formatDay(overview.nextReservationAt)}
                        </span>
                      </dd>
                    ) : (
                      <dd className="admin-vperf__activity-empty">—</dd>
                    )}
                  </div>
                  <div className="admin-vperf__activity-item">
                    <dt>{t('admin.vehicleStats.lastRental')}</dt>
                    {overview.lastRentalAt ? (
                      <dd>
                        <span className="admin-vperf__activity-main">
                          {formatDay(overview.lastRentalAt)}
                        </span>
                      </dd>
                    ) : (
                      <dd className="admin-vperf__activity-empty">—</dd>
                    )}
                  </div>
                </dl>
                <p className="admin-vperf__availability">
                  {t('admin.vehicleStats.availabilityDays', {
                    available: overview.availableDays ?? overview.periodDays ?? 0,
                    unavailable: overview.unavailableDays ?? 0,
                  })}
                </p>
              </div>

              <div className="admin-vperf__chart">
                <div className="admin-vperf__section-head admin-vperf__section-head--chart">
                  <h3 className="admin-vperf__section-title">
                    {t('admin.vehicleStats.revenueTrend')}
                  </h3>
                  <SegmentedControl
                    className="admin-segment--premium"
                    options={grainOptions}
                    value={grain || stats.period?.grain || 'monthly'}
                    onChange={setGrain}
                    ariaLabel={t('admin.vehicleStats.grainAria')}
                  />
                </div>
                {loading ? (
                  <Skeleton className="h-44 w-full rounded-[var(--admin-radius)]" />
                ) : (
                  <RevenueChart data={trend} currency={currency} height={200} showValues={false} />
                )}
              </div>
            </section>

            <section className="admin-vperf__history">
              <h3 className="admin-panel-title mb-3">{t('admin.vehicleStats.rentalHistory')}</h3>
              <DataTable
                columns={[
                  {
                    key: 'customer',
                    label: t('admin.vehicleStats.colCustomer'),
                    render: (row) => row.customerName || t('admin.vehicleStats.guest'),
                  },
                  {
                    key: 'pickup',
                    label: t('admin.vehicleStats.colPickup'),
                    render: (row) => formatDay(row.pickupDate),
                  },
                  {
                    key: 'return',
                    label: t('admin.vehicleStats.colReturn'),
                    render: (row) => formatDay(row.returnDate),
                  },
                  {
                    key: 'duration',
                    label: t('admin.vehicleStats.colDuration'),
                    render: (row) => row.duration || 0,
                  },
                  {
                    key: 'overlapDays',
                    label: t('admin.vehicleStats.colOverlapDays'),
                    render: (row) => row.overlapDays ?? 0,
                  },
                  {
                    key: 'periodRevenue',
                    label: t('admin.vehicleStats.colPeriodRevenue'),
                    render: (row) => money(row.periodRevenue ?? row.revenue, currency),
                  },
                  {
                    key: 'revenue',
                    label: t('admin.vehicleStats.colBookingValue'),
                    render: (row) => money(row.revenue, currency),
                  },
                  {
                    key: 'status',
                    label: t('admin.vehicleStats.colStatus'),
                    render: (row) => <StatusBadge status={row.status} />,
                  },
                ]}
                data={history}
                emptyMessage={t('admin.vehicleStats.noRentals')}
              />
            </section>

            <section className="admin-vperf__history">
              <h3 className="admin-panel-title mb-3">{t('admin.vehicleStats.maintenanceHistory')}</h3>
              <DataTable
                columns={[
                  {
                    key: 'date',
                    label: t('admin.vehicleStats.colDate'),
                    render: (row) => formatDay(row.completedDate || row.scheduledDate),
                  },
                  {
                    key: 'type',
                    label: t('admin.vehicleStats.colType'),
                    render: (row) =>
                      row.title || row.type || t('admin.vehicleStats.maintenanceDefault'),
                  },
                  {
                    key: 'cost',
                    label: t('admin.vehicleStats.colCost'),
                    render: (row) => money(row.cost, currency),
                  },
                  {
                    key: 'down',
                    label: t('admin.vehicleStats.colDowntime'),
                    render: (row) => row.downtimeDays || 0,
                  },
                  {
                    key: 'notes',
                    label: t('admin.vehicleStats.colNotes'),
                    render: (row) => row.notes || '—',
                  },
                ]}
                data={maintenance}
                emptyMessage={t('admin.vehicleStats.noMaintenance')}
              />
            </section>
          </>
        )}
      </div>
    </AdminModal>
  )
}

export default VehicleStatsDrawer

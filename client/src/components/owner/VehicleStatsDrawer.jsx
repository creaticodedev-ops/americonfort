import React, { useEffect, useMemo, useState } from 'react'
import {
  AdminModal,
  AnalyticsPeriodBar,
  ChartCard,
  EmptyState,
  SegmentedControl,
  Skeleton,
  StatCard,
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

const money = (value, currency) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

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

  // Sync from parent when opening a vehicle / parent filter changes while open
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
  const name = `${vehicle?.brand || stats?.vehicle?.brand || ''} ${vehicle?.model || stats?.vehicle?.model || ''}`.trim()
  const fleetId = vehicle?.fleetId || stats?.vehicle?.fleetId || ''
  const plate = vehicle?.licensePlate || stats?.vehicle?.licensePlate || ''
  const availability = overview.availability || stats?.vehicle?.availability || 'available'

  const grainOptions = useMemo(
    () => [
      { id: 'daily', label: t('admin.vehicleStats.grainDaily') },
      { id: 'weekly', label: t('admin.vehicleStats.grainWeekly') },
      { id: 'monthly', label: t('admin.vehicleStats.grainMonthly') },
    ],
    [t],
  )

  const periodCaption = `${formatAnalyticsDate(from)} → ${formatAnalyticsDate(to)}`

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      size="xl"
      variant="drawer"
      title={name || t('admin.vehicleStats.title')}
      description={[fleetId, plate].filter(Boolean).join(' · ')}
    >
      <div className="space-y-5">
        <div className="admin-vehicle-analytics__identity">
          <img
            src={vehicle?.image || stats?.vehicle?.image || assets.car_image1}
            alt={name}
            className="h-14 w-14 rounded-[var(--admin-radius)] object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--admin-fg)] truncate">{name || '—'}</p>
            <p className="admin-vehicle-analytics__meta truncate">
              {[fleetId, plate].filter(Boolean).join(' · ') || '—'}
            </p>
            <p className="mt-0.5 text-xs text-[var(--admin-fg-muted)]">
              {t('admin.vehicleStats.vehicleScopeHint')}
            </p>
          </div>
          <StatusBadge
            status={
              availability === 'rented'
                ? 'active'
                : availability === 'maintenance'
                  ? 'maintenance'
                  : availability === 'offline'
                    ? 'inactive'
                    : 'confirmed'
            }
            label={availabilityLabel(availability, t)}
          />
        </div>

        <AnalyticsPeriodBar
          period={period}
          from={from}
          to={to}
          onChange={handlePeriodChange}
        />

        {loading && !stats ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-[var(--admin-radius)]" />
            <Skeleton className="h-40 w-full rounded-[var(--admin-radius)]" />
          </div>
        ) : !stats ? (
          <EmptyState title={t('admin.vehicleStats.none')} />
        ) : (
          <>
            <p className="text-xs text-[var(--admin-fg-muted)] -mt-2">
              {t('admin.vehicleStats.periodHint', { days: stats.period?.days || 0 })}
              <span className="mx-1.5 opacity-40">·</span>
              <span className="tabular-nums">{periodCaption}</span>
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard
                compact
                label={t('admin.vehicleStats.revenue')}
                value={money(overview.totalRevenue, currency)}
                hint={
                  overview.bookingValue != null && overview.bookingValue !== overview.totalRevenue
                    ? t('admin.vehicleStats.periodRevenueHint', {
                        booking: money(overview.bookingValue, currency),
                      })
                    : t('admin.vehicleStats.kpiRevenueHint')
                }
              />
              <StatCard compact label={t('admin.vehicleStats.rentals')} value={overview.totalBookings ?? 0} />
              <StatCard compact label={t('admin.vehicleStats.rentalDays')} value={overview.rentalDays ?? 0} />
              <StatCard compact label={t('admin.vehicleStats.utilization')} value={overview.utilizationRate || '0%'} />
              <StatCard compact label={t('admin.vehicleStats.averageRental')} value={overview.averageRentalDuration || '0 days'} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard compact label={t('admin.vehicleStats.completed')} value={overview.completedBookings ?? 0} />
              <StatCard
                compact
                label={t('admin.vehicleStats.activeNow')}
                value={overview.activeBookings ?? 0}
                hint={t('admin.vehicleStats.liveTag')}
              />
              <StatCard compact label={t('admin.vehicleStats.upcoming')} value={overview.upcomingBookings ?? 0} />
              <StatCard compact label={t('admin.vehicleStats.cancelled')} value={overview.cancelledBookings ?? 0} />
            </div>

            <section className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] p-4">
              <h3 className="admin-panel-title mb-1">
                {t('admin.vehicleStats.activityTitle')}
                <span className="admin-vehicle-analytics__live-tag">{t('admin.vehicleStats.liveTag')}</span>
              </h3>
              <p className="mb-3 text-xs text-[var(--admin-fg-muted)]">{t('admin.vehicleStats.activityLiveHint')}</p>
              <dl className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <dt className="text-[var(--admin-fg-muted)]">{t('admin.vehicleStats.currentRental')}</dt>
                  <dd className="mt-0.5 font-medium text-[var(--admin-fg)]">
                    {overview.currentlyRented
                      ? `${overview.currentCustomer || '—'} · ${formatDay(overview.currentPickupAt)} → ${formatDay(overview.currentReturnAt)}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-fg-muted)]">{t('admin.vehicleStats.nextReservation')}</dt>
                  <dd className="mt-0.5 font-medium text-[var(--admin-fg)]">
                    {overview.nextReservationAt
                      ? `${overview.nextCustomer || '—'} · ${formatDay(overview.nextReservationAt)}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--admin-fg-muted)]">{t('admin.vehicleStats.lastRental')}</dt>
                  <dd className="mt-0.5 font-medium text-[var(--admin-fg)]">{formatDay(overview.lastRentalAt)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-[var(--admin-fg-muted)]">
                {t('admin.vehicleStats.availabilityDays', {
                  available: overview.availableDays ?? overview.periodDays ?? 0,
                  unavailable: overview.unavailableDays ?? 0,
                })}
              </p>
            </section>

            <ChartCard
              title={t('admin.vehicleStats.revenueTrend')}
              action={
                <SegmentedControl
                  className="admin-segment--premium"
                  options={grainOptions}
                  value={grain || stats.period?.grain || 'monthly'}
                  onChange={setGrain}
                  ariaLabel={t('admin.vehicleStats.grainAria')}
                />
              }
            >
              <RevenueChart data={trend} currency={currency} height={180} />
            </ChartCard>

            <section>
              <h3 className="admin-panel-title mb-3">{t('admin.vehicleStats.rentalHistory')}</h3>
              <DataTable
                columns={[
                  { key: 'customer', label: t('admin.vehicleStats.colCustomer'), render: (row) => row.customerName || t('admin.vehicleStats.guest') },
                  { key: 'pickup', label: t('admin.vehicleStats.colPickup'), render: (row) => formatDay(row.pickupDate) },
                  { key: 'return', label: t('admin.vehicleStats.colReturn'), render: (row) => formatDay(row.returnDate) },
                  { key: 'duration', label: t('admin.vehicleStats.colDuration'), render: (row) => row.duration || 0 },
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
                  { key: 'status', label: t('admin.vehicleStats.colStatus'), render: (row) => <StatusBadge status={row.status} /> },
                ]}
                data={history}
                emptyMessage={t('admin.vehicleStats.noRentals')}
              />
            </section>

            <section>
              <h3 className="admin-panel-title mb-3">{t('admin.vehicleStats.maintenanceHistory')}</h3>
              <DataTable
                columns={[
                  { key: 'date', label: t('admin.vehicleStats.colDate'), render: (row) => formatDay(row.completedDate || row.scheduledDate) },
                  { key: 'type', label: t('admin.vehicleStats.colType'), render: (row) => row.title || row.type || t('admin.vehicleStats.maintenanceDefault') },
                  { key: 'cost', label: t('admin.vehicleStats.colCost'), render: (row) => money(row.cost, currency) },
                  { key: 'down', label: t('admin.vehicleStats.colDowntime'), render: (row) => row.downtimeDays || 0 },
                  { key: 'notes', label: t('admin.vehicleStats.colNotes'), render: (row) => row.notes || '—' },
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

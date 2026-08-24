import React, { useEffect, useMemo, useState } from 'react'
import { AdminModal, ChartCard, EmptyState, SegmentedControl, Skeleton, StatCard } from './ui'
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

const VehicleStatsDrawer = ({
  vehicle,
  open,
  onClose,
  period,
  from,
  to,
}) => {
  const { axios, currency } = useAppContext()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [grain, setGrain] = useState('')

  const carId = vehicle?._id

  useEffect(() => {
    if (!open || !carId || !from || !to) {
      setStats(null)
      return undefined
    }
    let cancelled = false
    const load = async () => {
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
    }
    load()
    return () => {
      cancelled = true
    }
  }, [axios, carId, from, grain, open, period, t, to])

  useEffect(() => {
    if (!open) setGrain('')
  }, [open])

  useEffect(() => {
    setGrain('')
  }, [carId, from, period, to])

  const overview = stats?.overview || {}
  const history = stats?.rentalHistory || []
  const trend = stats?.trend || []
  const maintenance = stats?.maintenanceHistory || []
  const name = `${vehicle?.brand || stats?.vehicle?.brand || ''} ${vehicle?.model || stats?.vehicle?.model || ''}`.trim()

  const grainOptions = useMemo(
    () => [
      { id: 'daily', label: t('admin.vehicleStats.grainDaily') },
      { id: 'weekly', label: t('admin.vehicleStats.grainWeekly') },
      { id: 'monthly', label: t('admin.vehicleStats.grainMonthly') },
    ],
    [t],
  )

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      size="xl"
      variant="drawer"
      title={name || t('admin.vehicleStats.title')}
      description={[
        vehicle?.fleetId || stats?.vehicle?.fleetId,
        vehicle?.licensePlate || stats?.vehicle?.licensePlate,
        from && to ? `${from} → ${to}` : '',
      ].filter(Boolean).join(' · ')}
    >
      {loading && !stats ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-[var(--admin-radius)]" />
          <Skeleton className="h-40 w-full rounded-[var(--admin-radius)]" />
        </div>
      ) : !stats ? (
        <EmptyState title={t('admin.vehicleStats.none')} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img
              src={vehicle?.image || stats.vehicle?.image || assets.car_image1}
              alt={name}
              className="h-14 w-14 rounded-[var(--admin-radius)] object-cover"
            />
            <div className="min-w-0">
              <p className="font-semibold text-[var(--admin-fg)]">{name}</p>
              <p className="text-sm text-[var(--admin-fg-secondary)]">
                {t('admin.vehicleStats.periodHint', { days: stats.period?.days || 0 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard compact label={t('admin.vehicleStats.revenue')} value={money(overview.totalRevenue, currency)} />
            <StatCard compact label={t('admin.vehicleStats.rentals')} value={overview.totalBookings ?? 0} />
            <StatCard compact label={t('admin.vehicleStats.rentalDays')} value={overview.rentalDays ?? 0} />
            <StatCard compact label={t('admin.vehicleStats.utilization')} value={overview.utilizationRate || '0%'} />
            <StatCard compact label={t('admin.vehicleStats.averageRental')} value={overview.averageRentalDuration || '0 days'} />
          </div>

          <ChartCard
            title={t('admin.vehicleStats.revenueTrend')}
            action={
              <SegmentedControl
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
                { key: 'revenue', label: t('admin.vehicleStats.revenue'), render: (row) => money(row.revenue, currency) },
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
        </div>
      )}
    </AdminModal>
  )
}

export default VehicleStatsDrawer

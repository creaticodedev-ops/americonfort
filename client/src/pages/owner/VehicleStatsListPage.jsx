import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { assets } from '../../assets/ownerAssets'
import DataTable from '../../components/owner/DataTable'
import StatusBadge from '../../components/owner/StatusBadge'
import VehicleStatsDrawer from '../../components/owner/VehicleStatsDrawer'
import {
  AdminPage,
  PageHeader,
  StatCard,
  EmptyState,
  SearchInput,
  PeriodRangeFilter,
  rangeForPeriod,
} from '../../components/owner/ui'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { downloadXlsxFromApi } from '../../utils/downloadXlsx'

const money = (value, currency) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const formatDay = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

const availabilityStatus = (row) => {
  if (row.availability === 'maintenance' || row.status === 'maintenance') return 'maintenance'
  if (row.availability === 'rented') return 'active'
  if (row.availability === 'offline' || !row.isAvaliable) return 'inactive'
  return 'confirmed'
}

const VehicleStatsListPage = ({ selectedVehicleId = '' }) => {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isOwner, axios, currency } = useAppContext()
  const { t } = useI18n()
  const fallbackImage = assets.car_image1

  const initialRange = rangeForPeriod('month')
  const [period, setPeriod] = useState(searchParams.get('period') || 'month')
  const [from, setFrom] = useState(searchParams.get('from') || initialRange.from)
  const [to, setTo] = useState(searchParams.get('to') || initialRange.to)
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('revenue')
  const [sortOrder, setSortOrder] = useState('desc')
  const [openId, setOpenId] = useState(selectedVehicleId || routeId || searchParams.get('vehicle') || '')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!isOwner || !from || !to) return undefined
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get('/api/owner/vehicle-stats', {
          params: { period, from, to },
        })
        if (cancelled) return
        if (data.success) setPayload(data)
        else toast.error(data.message || t('admin.vehicleStats.loadError'))
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
  }, [axios, from, isOwner, period, t, to])

  useEffect(() => {
    const next = new URLSearchParams()
    if (period) next.set('period', period)
    if (from) next.set('from', from)
    if (to) next.set('to', to)
    if (openId) next.set('vehicle', openId)
    setSearchParams(next, { replace: true })
  }, [from, openId, period, setSearchParams, to])

  const vehicles = payload?.vehicles || []
  const kpis = payload?.kpis || {}

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = q
      ? vehicles.filter((row) =>
        `${row.brand} ${row.model} ${row.fleetId} ${row.licensePlate}`.toLowerCase().includes(q),
      )
      : vehicles
    const dir = sortOrder === 'asc' ? 1 : -1
    const valueOf = (row, key) => {
      const v = row[key]
      if (v && (key.endsWith('At') || key.endsWith('Date'))) {
        const ts = new Date(v).getTime()
        return Number.isNaN(ts) ? 0 : ts
      }
      return Number(v ?? 0)
    }
    return [...rows].sort((a, b) => {
      const av = valueOf(a, sortBy)
      const bv = valueOf(b, sortBy)
      if (av === bv) return String(a.brand).localeCompare(String(b.brand))
      return av > bv ? dir : -dir
    })
  }, [search, sortBy, sortOrder, vehicles])

  const selected = vehicles.find((row) => row._id === openId) || (openId ? { _id: openId } : null)

  const performanceLabel = (rank) => {
    if (rank === 'best') return t('admin.vehicleStats.rankBest')
    if (rank === 'under') return t('admin.vehicleStats.rankUnder')
    return t('admin.vehicleStats.rankAverage')
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      await downloadXlsxFromApi(axios, '/api/owner/vehicle-stats/export', {
        params: { period, from, to },
        fallbackName: 'vehicle-statistics.xlsx',
      })
      toast.success(t('admin.exportUi.success'))
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.exportUi.failed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminPage>
      <PageHeader
        title={t('admin.vehicleStats.title')}
        description={t('admin.vehicleStats.subtitlePeriod', {
          from,
          to,
          count: vehicles.length,
        })}
        actions={
          <button type="button" disabled={exporting || loading} onClick={exportExcel} className="admin-btn admin-btn--secondary">
            {exporting ? t('admin.exportUi.exporting') : t('admin.exportUi.excel')}
          </button>
        }
      />

      <PeriodRangeFilter
        period={period}
        from={from}
        to={to}
        onChange={({ period: nextPeriod, from: nextFrom, to: nextTo }) => {
          setPeriod(nextPeriod)
          setFrom(nextFrom)
          setTo(nextTo)
        }}
        className="mb-5"
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <StatCard
          compact
          label={t('admin.vehicleStats.kpiRevenue')}
          value={loading ? '—' : money(kpis.totalRevenue, currency)}
          hint={t('admin.vehicleStats.kpiRevenueHint')}
        />
        <StatCard
          compact
          label={t('admin.vehicleStats.kpiRentals')}
          value={loading ? '—' : kpis.totalRentals ?? 0}
          hint={t('admin.vehicleStats.kpiRentalsHint')}
        />
        <StatCard
          compact
          label={t('admin.vehicleStats.rentalDays')}
          value={loading ? '—' : kpis.rentalDays ?? 0}
          hint={t('admin.vehicleStats.kpiDaysHint')}
        />
        <StatCard
          compact
          label={t('admin.vehicleStats.utilization')}
          value={loading ? '—' : `${kpis.fleetUtilization ?? 0}%`}
          hint={t('admin.vehicleStats.kpiUtilHint')}
        />
        <StatCard
          compact
          label={t('admin.vehicleStats.kpiAvgValue')}
          value={loading ? '—' : money(kpis.avgRentalValue, currency)}
        />
        <StatCard
          compact
          label={t('admin.vehicleStats.kpiAvgDuration')}
          value={loading ? '—' : `${kpis.avgDuration ?? 0}`}
        />
        <StatCard
          compact
          tone="success"
          label={t('admin.vehicleStats.kpiAvailable')}
          value={loading ? '—' : kpis.available ?? 0}
        />
        <StatCard
          compact
          tone="info"
          label={t('admin.vehicleStats.kpiRented')}
          value={loading ? '—' : kpis.rented ?? 0}
        />
        <StatCard
          compact
          label={t('admin.vehicleStats.kpiOffline')}
          value={loading ? '—' : kpis.offline ?? 0}
        />
        <StatCard
          compact
          tone="warning"
          label={t('admin.vehicleStats.kpiMaintenance')}
          value={loading ? '—' : kpis.maintenance ?? 0}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('admin.vehicleStats.searchPlaceholder')}
          className="sm:max-w-sm"
        />
        <p className="text-xs text-[var(--admin-fg-muted)]">
          {t('admin.vehicleStats.legend')}
        </p>
      </div>

      {loading && vehicles.length === 0 ? (
        <div className="admin-panel p-4"><div className="space-y-2">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="admin-skeleton h-10 w-full rounded-lg" />)}</div></div>
      ) : vehicles.length === 0 ? (
        <EmptyState title={t('admin.vehicleStats.none')} />
      ) : (
        <DataTable
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(key, order) => {
            setSortBy(key)
            setSortOrder(order)
          }}
          onRowClick={(row) => setOpenId(row._id)}
          emptyMessage={t('admin.vehicleStats.noMatches')}
          columns={[
            {
              key: 'vehicle',
              label: t('admin.vehicleStats.colVehicle'),
              render: (row) => (
                <div className="flex items-center gap-3 min-w-[14rem]">
                  <span className={`admin-rank-dot admin-rank-dot--${row.performance || 'average'}`} title={performanceLabel(row.performance)} />
                  <img
                    src={row.image || fallbackImage}
                    alt={`${row.brand} ${row.model}`}
                    onError={(e) => { e.currentTarget.src = fallbackImage }}
                    className="h-10 w-10 rounded-md object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--admin-fg)] truncate">{row.brand} {row.model}</p>
                    <p className="text-[11px] text-[var(--admin-fg-muted)] truncate">
                      {row.fleetId || '—'} · {row.licensePlate || '—'}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              label: t('admin.vehicleStats.colStatus'),
              render: (row) => (
                <StatusBadge
                  status={availabilityStatus(row)}
                  label={
                    row.availability === 'rented'
                      ? t('admin.vehicleStats.statusRented')
                      : row.availability === 'maintenance'
                        ? t('admin.vehicleStats.statusMaintenance')
                        : row.availability === 'offline'
                          ? t('admin.vehicleStats.statusOffline')
                          : t('admin.vehicleStats.statusAvailable')
                  }
                />
              ),
            },
            {
              key: 'totalRentals',
              sortKey: 'totalRentals',
              sortable: true,
              label: t('admin.vehicleStats.rentals'),
              render: (row) => (
                <span className="tabular-nums" title={t('admin.vehicleStats.rentalsBreakdown', { completed: row.completedRentals, upcoming: row.upcomingRentals })}>
                  {row.totalRentals}
                </span>
              ),
            },
            {
              key: 'revenue',
              sortKey: 'revenue',
              sortable: true,
              label: t('admin.vehicleStats.revenue'),
              render: (row) => <span className="tabular-nums font-medium">{money(row.revenue, currency)}</span>,
            },
            {
              key: 'utilization',
              sortKey: 'utilization',
              sortable: true,
              label: t('admin.vehicleStats.utilization'),
              render: (row) => <span className="tabular-nums">{row.utilization}%</span>,
            },
            {
              key: 'avgDuration',
              sortKey: 'avgDuration',
              sortable: true,
              label: t('admin.vehicleStats.averageRental'),
              render: (row) => <span className="tabular-nums">{row.avgDuration || 0}</span>,
            },
            {
              key: 'lastRentalAt',
              sortKey: 'lastRentalAt',
              sortable: true,
              label: t('admin.vehicleStats.colLastRental'),
              render: (row) => formatDay(row.lastRentalAt),
            },
            {
              key: 'actions',
              label: '',
              render: (row) => (
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenId(row._id)
                  }}
                >
                  {t('admin.vehicleStats.viewStats')}
                </button>
              ),
            },
          ]}
          data={filtered}
        />
      )}

      <VehicleStatsDrawer
        vehicle={selected}
        open={Boolean(openId)}
        onClose={() => {
          setOpenId('')
          if (routeId) navigate('/owner/vehicle-stats', { replace: true })
        }}
        period={period}
        from={from}
        to={to}
        onPeriodChange={({ period: nextPeriod, from: nextFrom, to: nextTo }) => {
          setPeriod(nextPeriod)
          setFrom(nextFrom)
          setTo(nextTo)
        }}
      />
    </AdminPage>
  )
}

export default VehicleStatsListPage

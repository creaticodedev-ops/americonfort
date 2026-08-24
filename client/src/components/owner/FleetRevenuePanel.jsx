import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'
import { EmptyState } from './ui'
import StatusBadge from './StatusBadge'

const money = (value, currency) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const availabilityStatus = (row) => {
  if (row.availability === 'maintenance' || row.status === 'maintenance') return 'maintenance'
  if (row.availability === 'rented') return 'active'
  if (row.availability === 'offline' || !row.isAvaliable) return 'inactive'
  return 'confirmed'
}

const availabilityLabel = (row, t) => {
  if (row.availability === 'maintenance' || row.status === 'maintenance') return t('admin.ops.maintenance')
  if (row.availability === 'rented') return t('admin.ops.onRent')
  if (row.availability === 'offline' || !row.isAvaliable) return t('admin.fleetUi.offline')
  return t('admin.ops.available')
}

const PerformancePill = ({ performance, t }) => {
  const map = {
    best: { label: t('admin.ops.perfBest'), className: 'is-best' },
    under: { label: t('admin.ops.perfUnder'), className: 'is-under' },
    average: { label: t('admin.ops.perfAverage'), className: 'is-avg' },
  }
  const cfg = map[performance] || map.average
  return <span className={`admin-fleetrev__perf ${cfg.className}`}>{cfg.label}</span>
}

/**
 * Period-scoped fleet revenue ranking — uses /api/owner/vehicle-stats (same logic as Vehicle Statistics).
 */
export const FleetRevenuePanel = ({
  vehicles = [],
  kpis = null,
  currency = '',
  loading = false,
  limit = 8,
}) => {
  const { t } = useI18n()

  const ranked = useMemo(() => {
    const list = [...(vehicles || [])]
    list.sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0))
    return list.slice(0, limit)
  }, [vehicles, limit])

  const maxRevenue = Math.max(1, ...ranked.map((v) => Number(v.revenue) || 0))

  if (loading) {
    return <p className="text-sm text-[var(--admin-fg-muted)] py-6">{t('admin.common.loading')}</p>
  }

  if (!ranked.length) {
    return (
      <EmptyState
        icon="car"
        title={t('admin.ops.fleetRevEmpty')}
        description={t('admin.ops.fleetRevEmptyHint')}
        action={
          <Link to="/owner/add-car" className="admin-btn admin-btn--primary admin-btn--sm">
            {t('admin.menu.addCar')}
          </Link>
        }
      />
    )
  }

  return (
    <div className="admin-fleetrev">
      {kpis ? (
        <div className="admin-fleetrev__kpis">
          <div>
            <p className="admin-fleetrev__kpi-label">{t('admin.ops.fleetRevPeriod')}</p>
            <p className="admin-fleetrev__kpi-value tabular-nums">{money(kpis.totalRevenue, currency)}</p>
          </div>
          <div>
            <p className="admin-fleetrev__kpi-label">{t('admin.ops.fleetRevRentals')}</p>
            <p className="admin-fleetrev__kpi-value tabular-nums">{kpis.totalRentals ?? 0}</p>
          </div>
          <div>
            <p className="admin-fleetrev__kpi-label">{t('admin.ops.fleetRevUtil')}</p>
            <p className="admin-fleetrev__kpi-value tabular-nums">{kpis.fleetUtilization ?? 0}%</p>
          </div>
          <div>
            <p className="admin-fleetrev__kpi-label">{t('admin.ops.avgPerRental')}</p>
            <p className="admin-fleetrev__kpi-value tabular-nums">{money(kpis.avgRentalValue, currency)}</p>
          </div>
        </div>
      ) : null}

      {/* Mobile cards */}
      <div className="admin-fleetrev__cards lg:hidden">
        {ranked.map((row, index) => {
          const title = [row.brand, row.model].filter(Boolean).join(' ') || '—'
          const share = Math.round(((Number(row.revenue) || 0) / maxRevenue) * 100)
          return (
            <Link
              key={row._id}
              to={`/owner/vehicle-stats/${row._id}`}
              className="admin-fleetrev__card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="admin-fleetrev__rank">#{index + 1}</p>
                  <p className="admin-fleetrev__title truncate">{title}</p>
                  <p className="admin-fleetrev__plate truncate">
                    {row.licensePlate || t('admin.walkIn.noPlate')}
                  </p>
                </div>
                <PerformancePill performance={row.performance} t={t} />
              </div>
              <div className="admin-fleetrev__card-metrics">
                <div>
                  <span>{t('admin.ops.fleetRevRentals')}</span>
                  <strong className="tabular-nums">{row.totalRentals ?? 0}</strong>
                </div>
                <div>
                  <span>{t('admin.ops.revenue')}</span>
                  <strong className="tabular-nums">{money(row.revenue, currency)}</strong>
                </div>
                <div>
                  <span>{t('admin.ops.avgPerRental')}</span>
                  <strong className="tabular-nums">{money(row.avgRentalRevenue, currency)}</strong>
                </div>
                <div>
                  <span>{t('admin.ops.utilization')}</span>
                  <strong className="tabular-nums">{row.utilization ?? 0}%</strong>
                </div>
              </div>
              <div className="admin-fleetrev__bar" aria-hidden>
                <span style={{ width: `${Math.max(share, row.revenue ? 6 : 0)}%` }} />
              </div>
              <div className="mt-2">
                <StatusBadge status={availabilityStatus(row)} label={availabilityLabel(row, t)} />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="admin-fleetrev__table-wrap hidden lg:block">
        <table className="admin-table admin-fleetrev__table">
          <thead>
            <tr>
              <th>{t('admin.ops.vehicle')}</th>
              <th>{t('admin.ops.fleetRevRentals')}</th>
              <th>{t('admin.ops.revenue')}</th>
              <th>{t('admin.ops.avgPerRental')}</th>
              <th>{t('admin.ops.utilization')}</th>
              <th>{t('admin.ops.status')}</th>
              <th>{t('admin.ops.performance')}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, index) => {
              const title = [row.brand, row.model].filter(Boolean).join(' ') || '—'
              const share = Math.round(((Number(row.revenue) || 0) / maxRevenue) * 100)
              return (
                <tr key={row._id}>
                  <td>
                    <Link to={`/owner/vehicle-stats/${row._id}`} className="admin-fleetrev__vehicle-link">
                      <span className="admin-fleetrev__rank-inline">#{index + 1}</span>
                      <span className="min-w-0">
                        <span className="admin-fleetrev__title block truncate">{title}</span>
                        <span className="admin-fleetrev__plate block truncate">
                          {row.licensePlate || t('admin.walkIn.noPlate')}
                        </span>
                      </span>
                    </Link>
                    <div className="admin-fleetrev__bar mt-1.5 max-w-[14rem]" aria-hidden>
                      <span style={{ width: `${Math.max(share, row.revenue ? 6 : 0)}%` }} />
                    </div>
                  </td>
                  <td className="tabular-nums font-medium">{row.totalRentals ?? 0}</td>
                  <td className="tabular-nums font-semibold">{money(row.revenue, currency)}</td>
                  <td className="tabular-nums">{money(row.avgRentalRevenue, currency)}</td>
                  <td className="tabular-nums">{row.utilization ?? 0}%</td>
                  <td>
                    <StatusBadge status={availabilityStatus(row)} label={availabilityLabel(row, t)} />
                  </td>
                  <td>
                    <PerformancePill performance={row.performance} t={t} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FleetRevenuePanel

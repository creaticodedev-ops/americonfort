import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'
import { EmptyState } from './ui'

const money = (value, currency) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const statusWord = (row, t) => {
  if (row.availability === 'maintenance' || row.status === 'maintenance') return t('admin.ops.maintenance')
  if (row.availability === 'rented') return t('admin.ops.onRent')
  if (row.availability === 'offline' || !row.isAvaliable) return t('admin.fleetUi.offline')
  return t('admin.ops.available')
}

/**
 * Elegant ranked list — identity + revenue share. Detail lives on vehicle stats.
 */
export const FleetRevenuePanel = ({
  vehicles = [],
  currency = '',
  loading = false,
  limit = 5,
}) => {
  const { t } = useI18n()

  const ranked = useMemo(() => {
    const list = [...(vehicles || [])]
    list.sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0))
    return list.slice(0, limit)
  }, [vehicles, limit])

  const maxRevenue = Math.max(1, ...ranked.map((v) => Number(v.revenue) || 0))

  if (loading) {
    return <p className="admin-pulse-empty">{t('admin.common.loading')}</p>
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
    <ol className="admin-rank">
      {ranked.map((row, index) => {
        const title = [row.brand, row.model].filter(Boolean).join(' ') || '—'
        const share = Math.round(((Number(row.revenue) || 0) / maxRevenue) * 100)
        const under = row.performance === 'under' && !(Number(row.revenue) > 0)
        return (
          <li key={row._id} className="admin-rank__item">
            <Link to={`/owner/vehicle-stats/${row._id}`} className="admin-rank__link">
              <span className="admin-rank__index tabular-nums" aria-hidden>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="admin-rank__main min-w-0">
                <span className="admin-rank__title truncate">{title}</span>
                <span className="admin-rank__sub truncate">
                  {row.licensePlate || t('admin.walkIn.noPlate')}
                  <span className="admin-rank__sep">·</span>
                  {statusWord(row, t)}
                  {row.totalRentals != null ? (
                    <>
                      <span className="admin-rank__sep">·</span>
                      {t('admin.ops.rentalCount', { count: row.totalRentals })}
                    </>
                  ) : null}
                  {under ? (
                    <>
                      <span className="admin-rank__sep">·</span>
                      <span className="admin-rank__soft">{t('admin.ops.perfUnder')}</span>
                    </>
                  ) : null}
                </span>
                <span
                  className="admin-rank__track"
                  aria-hidden
                >
                  <span
                    className="admin-rank__fill"
                    style={{ width: `${row.revenue ? Math.max(share, 4) : 0}%` }}
                  />
                </span>
              </span>
              <span className="admin-rank__figures">
                <span className="admin-rank__revenue tabular-nums">{money(row.revenue, currency)}</span>
                <span className="admin-rank__util tabular-nums">
                  {row.utilization != null ? `${row.utilization}%` : '—'}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

export default FleetRevenuePanel

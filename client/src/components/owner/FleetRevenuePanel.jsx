import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'
import { EmptyState } from './ui'
import { Icon } from './ui/adminIcons'

const money = (value, currency) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const statusTone = (row) => {
  if (row.availability === 'maintenance' || row.status === 'maintenance') return 'maint'
  if (row.availability === 'rented') return 'rent'
  if (row.availability === 'offline' || !row.isAvaliable) return 'off'
  return 'ok'
}

const statusWord = (row, t) => {
  if (row.availability === 'maintenance' || row.status === 'maintenance') return t('admin.ops.maintenance')
  if (row.availability === 'rented') return t('admin.ops.onRent')
  if (row.availability === 'offline' || !row.isAvaliable) return t('admin.fleetUi.offline')
  return t('admin.ops.available')
}

const VehicleThumb = ({ image }) => {
  const [broken, setBroken] = useState(false)
  if (!image || broken) {
    return (
      <span className="admin-dash-rank__thumb admin-dash-rank__thumb--fallback" aria-hidden>
        <Icon name="car" className="h-4 w-4" />
      </span>
    )
  }
  return (
    <span className="admin-dash-rank__thumb">
      <img src={image} alt="" loading="lazy" onError={() => setBroken(true)} />
    </span>
  )
}

/** Ranked fleet revenue for the owner dashboard. */
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
    return (
      <div className="admin-dash-rank admin-dash-rank--skel" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-dash-rank__skel-row" />
        ))}
      </div>
    )
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
    <ol className="admin-dash-rank">
      {ranked.map((row, index) => {
        const title = [row.brand, row.model].filter(Boolean).join(' ') || '—'
        const share = Math.round(((Number(row.revenue) || 0) / maxRevenue) * 100)
        const tone = statusTone(row)

        return (
          <li key={row._id}>
            <Link to={`/owner/vehicle-stats/${row._id}`} className="admin-dash-rank__row">
              <span className="admin-dash-rank__ord tabular-nums">{index + 1}</span>
              <VehicleThumb image={row.image} />
              <span className="admin-dash-rank__body min-w-0">
                <span className="admin-dash-rank__top">
                  <span className="admin-dash-rank__title truncate">{title}</span>
                  <span className={`admin-dash-rank__status is-${tone}`}>
                    {statusWord(row, t)}
                  </span>
                </span>
                <span className="admin-dash-rank__meta truncate">
                  {row.licensePlate || t('admin.walkIn.noPlate')}
                  <span className="admin-dash-rank__dot">·</span>
                  {t('admin.ops.rentalCount', { count: row.totalRentals || 0 })}
                  {row.avgRentalRevenue > 0 && (
                    <>
                      <span className="admin-dash-rank__dot">·</span>
                      {t('admin.ops.avgShort', { amount: money(row.avgRentalRevenue, currency) })}
                    </>
                  )}
                </span>
                <span className="admin-dash-rank__track" aria-hidden>
                  <span
                    className="admin-dash-rank__fill"
                    style={{ width: `${row.revenue ? Math.max(share, 6) : 0}%` }}
                  />
                </span>
              </span>
              <span className="admin-dash-rank__money">
                <span className="admin-dash-rank__revenue tabular-nums">
                  {money(row.revenue, currency)}
                </span>
                <span className="admin-dash-rank__util tabular-nums">
                  {row.utilization != null
                    ? t('admin.ops.utilShort', { value: row.utilization })
                    : '—'}
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

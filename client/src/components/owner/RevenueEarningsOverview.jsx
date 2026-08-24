import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nContext'
import { EmptyState } from './ui'

const Delta = ({ value, label }) => {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) {
    return (
      <span className="admin-earn__delta is-flat">
        {label}
      </span>
    )
  }
  const up = n > 0
  return (
    <span className={`admin-earn__delta ${up ? 'is-up' : 'is-down'}`}>
      {up ? '↑' : '↓'} {Math.abs(n)}%
      {label ? <span className="admin-earn__delta-label">{label}</span> : null}
    </span>
  )
}

const MiniBars = ({ data = [], currency = '' }) => {
  const max = Math.max(1, ...data.map((d) => Number(d.amount) || 0))
  return (
    <div className="admin-earn__spark" aria-hidden>
      {data.map((item) => {
        const amount = Number(item.amount) || 0
        const pct = Math.max(amount > 0 ? 8 : 3, Math.round((amount / max) * 100))
        return (
          <div
            key={item.key}
            className="admin-earn__spark-bar"
            style={{ height: `${pct}%` }}
            title={`${item.label}: ${currency}${amount}`}
          />
        )
      })}
    </div>
  )
}

/**
 * Dashboard earnings panel — driven by /api/owner/analytics (same revenue statuses as Analytics page).
 */
export const RevenueEarningsOverview = ({ analytics, currency = '' }) => {
  const { t } = useI18n()

  const money = (n) =>
    `${currency}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

  const comparisons = analytics?.comparisons || {}
  const spark = useMemo(
    () => (analytics?.monthlyTrend || []).slice(-8),
    [analytics],
  )
  const topVehicles = analytics?.topVehicles || []
  const total = Number(analytics?.totalRevenue) || 0
  const onlineShare = total > 0
    ? Math.round(((Number(analytics?.onlineRevenue) || 0) / total) * 100)
    : 0
  const walkInShare = Math.max(0, 100 - onlineShare)

  if (!analytics) {
    return (
      <EmptyState
        title={t('admin.ops.earningsEmpty')}
        description={t('admin.ops.earningsEmptyHint')}
      />
    )
  }

  const periods = [
    {
      key: 'today',
      label: t('admin.ops.earningsToday'),
      value: analytics.todayRevenue,
      delta: comparisons.todayVsYesterday,
      deltaLabel: t('admin.ops.vsYesterday'),
    },
    {
      key: 'week',
      label: t('admin.ops.earningsWeek'),
      value: analytics.weeklyRevenue,
      delta: comparisons.weekVsPrev,
      deltaLabel: t('admin.ops.vsPrevWeek'),
    },
    {
      key: 'month',
      label: t('admin.ops.earningsMonth'),
      value: analytics.monthlyRevenue,
      delta: comparisons.monthVsPrev,
      deltaLabel: t('admin.ops.vsPrevMonth'),
    },
    {
      key: 'year',
      label: t('admin.ops.earningsYear'),
      value: analytics.yearlyRevenue,
      delta: comparisons.yearVsPrev,
      deltaLabel: t('admin.ops.vsPrevYear'),
    },
  ]

  return (
    <div className="admin-earn">
      <div className="admin-earn__hero">
        <div className="min-w-0">
          <p className="admin-earn__eyebrow">{t('admin.ops.earningsTotal')}</p>
          <p className="admin-earn__total tabular-nums">{money(analytics.totalRevenue)}</p>
          <div className="admin-earn__hero-meta">
            <Delta value={comparisons.monthVsPrev} label={t('admin.ops.vsPrevMonth')} />
            <span className="admin-earn__pill">
              {t('admin.ops.earningsRentals', { count: analytics.bookingCount || 0 })}
            </span>
          </div>
        </div>
        <div className="admin-earn__hero-chart">
          <MiniBars data={spark} currency={currency} />
          <p className="admin-earn__chart-caption">{t('admin.ops.earningsTrendHint')}</p>
        </div>
      </div>

      <div className="admin-earn__periods">
        {periods.map((row) => (
          <div key={row.key} className="admin-earn__period">
            <p className="admin-earn__period-label">{row.label}</p>
            <p className="admin-earn__period-value tabular-nums">{money(row.value)}</p>
            <Delta value={row.delta} label={row.deltaLabel} />
          </div>
        ))}
      </div>

      <div className="admin-earn__stats">
        <div className="admin-earn__stat">
          <p className="admin-earn__stat-label">{t('admin.ops.avgPerRental')}</p>
          <p className="admin-earn__stat-value tabular-nums">{money(analytics.averageRevenuePerRental)}</p>
        </div>
        <div className="admin-earn__stat">
          <p className="admin-earn__stat-label">{t('admin.ops.paidRentals')}</p>
          <p className="admin-earn__stat-value tabular-nums">{analytics.paidBookingCount ?? 0}</p>
          <p className="admin-earn__stat-hint">
            {t('admin.ops.ofConfirmed', { count: analytics.bookingCount || 0 })}
          </p>
        </div>
        <div className="admin-earn__stat admin-earn__stat--split">
          <p className="admin-earn__stat-label">{t('admin.ops.channelMix')}</p>
          <div className="admin-earn__split-bar" aria-hidden>
            <span style={{ width: `${onlineShare}%` }} className="is-online" />
            <span style={{ width: `${walkInShare}%` }} className="is-walkin" />
          </div>
          <div className="admin-earn__split-legend">
            <span>{t('admin.ops.online')}: {money(analytics.onlineRevenue)}</span>
            <span>{t('admin.ops.walkIn')}: {money(analytics.walkInRevenue)}</span>
          </div>
        </div>
      </div>

      {topVehicles.length > 0 && (
        <div className="admin-earn__top">
          <div className="admin-earn__top-head">
            <p className="admin-earn__stat-label">{t('admin.ops.topVehicles')}</p>
            <Link to="/owner/analytics" className="text-[11px] font-medium text-[var(--admin-accent)]">
              {t('admin.ops.viewAnalytics')}
            </Link>
          </div>
          <ul className="admin-earn__top-list">
            {topVehicles.map((v) => {
              const title = [v.brand, v.model].filter(Boolean).join(' ') || '—'
              const share = total > 0 ? Math.round((Number(v.revenue) / total) * 100) : 0
              return (
                <li key={String(v.carId)} className="admin-earn__top-row">
                  <div className="min-w-0">
                    <p className="admin-earn__top-title truncate">{title}</p>
                    <p className="admin-earn__top-sub truncate">
                      {v.licensePlate || t('admin.walkIn.noPlate')}
                      {' · '}
                      {t('admin.ops.rentalCount', { count: v.rentals || 0 })}
                    </p>
                  </div>
                  <div className="admin-earn__top-right">
                    <p className="tabular-nums font-semibold text-sm">{money(v.revenue)}</p>
                    <div className="admin-earn__top-track">
                      <span style={{ width: `${Math.max(share, 4)}%` }} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default RevenueEarningsOverview

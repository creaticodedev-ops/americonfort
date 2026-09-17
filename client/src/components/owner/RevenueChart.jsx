import React, { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import '../../styles/analytics-dashboard.css'

const valueOf = (item) => {
  const n = Number(item?.amount ?? item?.revenue ?? item?.value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Premium MAD display: `3 300 MAD` (fr-FR grouping). */
export const formatChartMoney = (n, currency = 'MAD') => {
  const code = String(currency || 'MAD').replace(/\s+/g, '') || 'MAD'
  const formatted = Number(n || 0).toLocaleString('fr-FR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })
  return `${formatted} ${code}`
}

const periodCaption = (item) => {
  if (item?.from && item?.to && item.from !== item.to) {
    try {
      const a = new Date(item.from)
      const b = new Date(item.to)
      if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
        const opts = { day: 'numeric', month: 'short' }
        return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`
      }
    } catch {
      /* ignore */
    }
  }
  return item?.label || ''
}

/**
 * Premium CSS bar chart — styles co-located so Vehicle Stats / Analytics
 * never render unstyled (concatenated) value strings.
 */
const RevenueChart = ({
  data = [],
  currency = 'MAD',
  height = 220,
  showValues = false,
  emptyHint,
  sparseHint,
}) => {
  const { t } = useI18n()
  const [active, setActive] = useState(null)

  const rawSeries = useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((item) => ({
        ...item,
        value: valueOf(item),
        count: Number(item?.count ?? item?.bookings) || 0,
      })),
    [data],
  )

  const nonZero = rawSeries.filter((d) => d.value > 0)
  const sparseMode = nonZero.length > 0 && nonZero.length <= 5 && rawSeries.length > 8
  const series = sparseMode ? nonZero : rawSeries

  const max = Math.max(0, ...series.map((d) => d.value))
  const hasRevenue = nonZero.length > 0
  const chartHeight = hasRevenue
    ? Math.min(Math.max(height, 180), Math.max(180, 100 + series.length * 6))
    : 120

  const ticks = useMemo(() => {
    if (max <= 0) return [0]
    const exp = Math.floor(Math.log10(max))
    const step = 10 ** Math.max(0, exp - 1)
    const top = Math.ceil(max / step) * step || max
    return [top, top * 0.5, 0]
  }, [max])

  if (!rawSeries.length) {
    return (
      <div className="ax-chart-empty">
        <p className="ax-chart-empty__title">{emptyHint || t('admin.analytics.chartEmpty')}</p>
      </div>
    )
  }

  if (!hasRevenue) {
    return (
      <div className="ax-chart-empty">
        <p className="ax-chart-empty__title">{emptyHint || t('admin.analytics.chartEmpty')}</p>
        <p className="ax-chart-empty__hint">{t('admin.analytics.chartEmptyHint')}</p>
      </div>
    )
  }

  const tip = active
    ? [
        periodCaption(active) || active.label,
        formatChartMoney(active.value, currency),
        active.count ? t('admin.analytics.rentalsCount', { count: active.count }) : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <div className="ax-chart">
      {sparseMode ? (
        <p className="ax-chart__banner">
          {sparseHint || t('admin.analytics.chartSparseHint', { count: nonZero.length })}
        </p>
      ) : null}

      {tip ? (
        <div className="ax-chart__tooltip" role="status">
          {tip}
        </div>
      ) : (
        <div className="ax-chart__tooltip ax-chart__tooltip--idle" aria-hidden>
          {t('admin.analytics.chartHoverHint')}
        </div>
      )}

      <div className="ax-chart__frame" style={{ '--ax-chart-h': `${chartHeight}px` }}>
        <div className="ax-chart__yaxis" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="ax-chart__tick">
              {formatChartMoney(tick, currency)}
            </span>
          ))}
        </div>

        <div className="ax-chart__plot">
          <div className="ax-chart__grid" aria-hidden>
            {ticks.map((tick) => (
              <div key={`g-${tick}`} className="ax-chart__gridline" />
            ))}
          </div>

          <div
            className={`ax-chart__bars${sparseMode ? ' is-sparse' : ''}`}
            style={{
              minWidth: series.length > 12 ? `${series.length * 2.5}rem` : undefined,
            }}
            onMouseLeave={() => setActive(null)}
          >
            {series.map((item) => {
              const pct =
                max > 0 && item.value > 0
                  ? Math.max(4, Math.round((item.value / max) * 100))
                  : 0
              const id = item.key || item.label
              const isActive = active && (active.key || active.label) === id
              return (
                <button
                  key={id}
                  type="button"
                  className={`ax-chart__col${isActive ? ' is-active' : ''}${
                    item.value <= 0 ? ' is-zero' : ''
                  }`}
                  onMouseEnter={() => setActive(item)}
                  onFocus={() => setActive(item)}
                  onBlur={() => setActive(null)}
                  aria-label={`${periodCaption(item) || item.label}: ${formatChartMoney(
                    item.value,
                    currency,
                  )}`}
                >
                  <div className="ax-chart__track">
                    {showValues && item.value > 0 ? (
                      <span className="ax-chart__val">{formatChartMoney(item.value, currency)}</span>
                    ) : null}
                    <div
                      className={`ax-chart__bar${item.value > 0 ? ' is-filled' : ''}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="ax-chart__label">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Horizontal ranking bars for vehicles / categories / locations */
export const RankBars = ({
  rows = [],
  currency = 'MAD',
  valueKey = 'revenue',
  labelFn,
  maxRows = 6,
  emptyHint,
}) => {
  const { t } = useI18n()
  const list = (rows || []).slice(0, maxRows)
  const max = Math.max(0, ...list.map((r) => Number(r[valueKey]) || 0))

  if (!list.length || max <= 0) {
    return (
      <div className="ax-empty ax-empty--compact">
        <p className="ax-empty__title">{emptyHint || t('admin.analytics.noBreakdown')}</p>
      </div>
    )
  }

  return (
    <ul className="ax-rank">
      {list.map((row, i) => {
        const value = Number(row[valueKey]) || 0
        const pct = max > 0 ? Math.round((value / max) * 100) : 0
        const label = labelFn ? labelFn(row) : row.label || row.category || row.location || '—'
        return (
          <li key={`${label}-${i}`} className="ax-rank__row">
            <div className="ax-rank__head">
              <span className="ax-rank__pos">{i + 1}</span>
              <span className="ax-rank__label" title={label}>
                {label}
              </span>
              <span className="ax-rank__value tabular-nums">{formatChartMoney(value, currency)}</span>
            </div>
            <div className="ax-rank__track" aria-hidden>
              <div className="ax-rank__fill" style={{ width: `${pct}%` }} />
            </div>
            {row.rentals != null ? (
              <p className="ax-rank__meta">
                {t('admin.analytics.rentalsCount', { count: row.rentals })}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/** Part-to-whole channel / status / payment distribution */
export const ShareBars = ({ rows = [], currency = 'MAD', labelFn, valueKey = 'revenue', emptyHint }) => {
  const { t } = useI18n()
  const list = (rows || []).filter((r) => (Number(r[valueKey]) || Number(r.count) || 0) > 0)
  const total = list.reduce((s, r) => s + (Number(r[valueKey]) || 0), 0)

  if (!list.length) {
    return (
      <div className="ax-empty ax-empty--compact">
        <p className="ax-empty__title">{emptyHint || t('admin.analytics.noBreakdown')}</p>
      </div>
    )
  }

  return (
    <div className="ax-share">
      <div className="ax-share__track" aria-hidden>
        {list.map((row, i) => {
          const value = Number(row[valueKey]) || 0
          const pct = total > 0 ? (value / total) * 100 : 0
          if (pct <= 0) return null
          return (
            <div
              key={row._id || row.id || i}
              className={`ax-share__seg ax-share__seg--${i % 4}`}
              style={{ width: `${pct}%` }}
              title={`${labelFn?.(row) || row._id}: ${formatChartMoney(value, currency)}`}
            />
          )
        })}
      </div>
      <ul className="ax-share__legend">
        {list.map((row, i) => {
          const value = Number(row[valueKey]) || 0
          const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0
          return (
            <li key={row._id || row.id || i} className="ax-share__item">
              <span className={`ax-share__dot ax-share__seg--${i % 4}`} />
              <span className="ax-share__name">{labelFn?.(row) || row._id}</span>
              {row.count != null ? (
                <span className="ax-share__count tabular-nums">{row.count}</span>
              ) : null}
              <span className="ax-share__pct tabular-nums">{pct}%</span>
              <span className="ax-share__amt tabular-nums">{formatChartMoney(value, currency)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default RevenueChart

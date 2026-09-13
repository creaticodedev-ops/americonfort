import React, { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'

const valueOf = (item) => {
  const n = Number(item?.amount ?? item?.revenue ?? item?.value ?? 0)
  return Number.isFinite(n) ? n : 0
}

const formatMoney = (n, currency) =>
  `${currency}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

/**
 * Premium CSS bar chart — density-aware, tooltip on focus/hover, no fake filler data.
 */
const RevenueChart = ({
  data = [],
  currency = '',
  height = 240,
  showValues = true,
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
    ? Math.min(height, Math.max(160, 120 + series.length * 8))
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
    ? `${active.label}: ${formatMoney(active.value, currency)}${
        active.count ? ` · ${active.count}` : ''
      }`
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

      <div className="ax-chart__frame" style={{ minHeight: chartHeight }}>
        <div className="ax-chart__yaxis" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="ax-chart__tick">
              {formatMoney(tick, currency)}
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
              minWidth: series.length > 10 ? `${series.length * 2.75}rem` : undefined,
              height: chartHeight,
            }}
            onMouseLeave={() => setActive(null)}
          >
            {series.map((item) => {
              const pct =
                max > 0 && item.value > 0
                  ? Math.max(8, Math.round((item.value / max) * 100))
                  : 0
              const isActive = active && (active.key || active.label) === (item.key || item.label)
              return (
                <button
                  key={item.key || item.label}
                  type="button"
                  className={`ax-chart__col${isActive ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(item)}
                  onFocus={() => setActive(item)}
                  onBlur={() => setActive(null)}
                  aria-label={`${item.label}: ${formatMoney(item.value, currency)}`}
                >
                  {showValues && item.value > 0 ? (
                    <span className="ax-chart__val">{formatMoney(item.value, currency)}</span>
                  ) : (
                    <span className="ax-chart__val ax-chart__val--spacer" aria-hidden />
                  )}
                  <div
                    className="ax-chart__bar is-filled"
                    style={{ height: `${pct}%` }}
                  />
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
  currency = '',
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
              <span className="ax-rank__value tabular-nums">{formatMoney(value, currency)}</span>
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
export const ShareBars = ({ rows = [], currency = '', labelFn, valueKey = 'revenue', emptyHint }) => {
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
              title={`${labelFn?.(row) || row._id}: ${formatMoney(value, currency)}`}
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
              <span className="ax-share__amt tabular-nums">{formatMoney(value, currency)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default RevenueChart

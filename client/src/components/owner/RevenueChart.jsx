import React, { useMemo } from 'react'
import { useI18n } from '../../i18n/I18nContext'

const valueOf = (item) => {
  const n = Number(item?.amount ?? item?.revenue ?? item?.value ?? 0)
  return Number.isFinite(n) ? n : 0
}

const formatMoney = (n, currency) =>
  `${currency}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

/**
 * Premium CSS bar chart with Y-axis scale, value labels, and density-aware layout.
 * No chart library — keeps the analytics bundle light.
 */
const RevenueChart = ({
  data = [],
  currency = '',
  height = 240,
  showValues = true,
  emptyHint,
}) => {
  const { t } = useI18n()

  const series = useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((item) => ({
        ...item,
        value: valueOf(item),
        count: Number(item?.count) || 0,
      })),
    [data],
  )

  const max = Math.max(0, ...series.map((d) => d.value))
  const hasRevenue = series.some((d) => d.value > 0)
  const ticks = useMemo(() => {
    if (max <= 0) return [0]
    const nice = (() => {
      const exp = Math.floor(Math.log10(max))
      const step = 10 ** Math.max(0, exp - 1)
      const top = Math.ceil(max / step) * step
      return top || max
    })()
    return [nice, nice * 0.5, 0]
  }, [max])

  if (!series.length) {
    return (
      <div className="ax-chart-empty">
        <p>{emptyHint || t('admin.analytics.chartEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="ax-chart">
      {!hasRevenue ? (
        <p className="ax-chart__banner">{emptyHint || t('admin.analytics.chartEmpty')}</p>
      ) : null}

      <div className="ax-chart__frame" style={{ minHeight: height }}>
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
            className="ax-chart__bars"
            style={{
              minWidth: series.length > 10 ? `${series.length * 2.75}rem` : undefined,
              height,
            }}
          >
            {series.map((item) => {
              const pct =
                max > 0 && item.value > 0
                  ? Math.max(6, Math.round((item.value / max) * 100))
                  : 0
              return (
                <div key={item.key || item.label} className="ax-chart__col">
                  {showValues && item.value > 0 ? (
                    <span className="ax-chart__val">
                      {formatMoney(item.value, currency)}
                    </span>
                  ) : (
                    <span className="ax-chart__val ax-chart__val--spacer" aria-hidden />
                  )}
                  <div
                    className={`ax-chart__bar${item.value > 0 ? ' is-filled' : ''}`}
                    style={{ height: item.value > 0 ? `${pct}%` : '2px' }}
                    title={`${item.label}: ${formatMoney(item.value, currency)}${
                      item.count ? ` · ${item.count}` : ''
                    }`}
                  />
                  <span className="ax-chart__label">{item.label}</span>
                </div>
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
}) => {
  const { t } = useI18n()
  const list = (rows || []).slice(0, maxRows)
  const max = Math.max(0, ...list.map((r) => Number(r[valueKey]) || 0))

  if (!list.length || max <= 0) {
    return <p className="ax-muted">{t('admin.analytics.noBreakdown')}</p>
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

/** Part-to-whole channel / status distribution */
export const ShareBars = ({ rows = [], currency = '', labelFn }) => {
  const { t } = useI18n()
  const list = (rows || []).filter((r) => (Number(r.revenue) || Number(r.count) || 0) > 0)
  const total = list.reduce((s, r) => s + (Number(r.revenue) || 0), 0)

  if (!list.length) {
    return <p className="ax-muted">{t('admin.analytics.noBreakdown')}</p>
  }

  return (
    <div className="ax-share">
      <div className="ax-share__track" aria-hidden>
        {list.map((row, i) => {
          const value = Number(row.revenue) || 0
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
          const value = Number(row.revenue) || 0
          const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0
          return (
            <li key={row._id || row.id || i} className="ax-share__item">
              <span className={`ax-share__dot ax-share__seg--${i % 4}`} />
              <span className="ax-share__name">{labelFn?.(row) || row._id}</span>
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

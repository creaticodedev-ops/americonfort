import React, { useMemo } from 'react'
import { useI18n } from '../../i18n/I18nContext'

const valueOf = (item) => {
  const n = Number(item?.amount ?? item?.revenue ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Lightweight CSS bar chart — no chart library required */
const RevenueChart = ({ data = [], currency = '', height = 180 }) => {
  const { t } = useI18n()

  const series = useMemo(
    () => (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      value: valueOf(item),
    })),
    [data],
  )

  const max = Math.max(0, ...series.map((d) => d.value))
  const hasRevenue = series.some((d) => d.value > 0)

  if (!series.length) {
    return (
      <p className="text-sm text-[var(--admin-fg-muted)] py-10 text-center">
        {t('admin.leftover.noRevenue')}
      </p>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      {!hasRevenue ? (
        <p className="text-xs text-[var(--admin-fg-muted)] mb-2 text-center">
          {t('admin.leftover.noRevenue')}
        </p>
      ) : null}
      <div style={{ minWidth: series.length > 10 ? `${series.length * 2.5}rem` : undefined }}>
        <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }}>
          {series.map((item) => {
            const pct = max > 0 && item.value > 0
              ? Math.max(8, Math.round((item.value / max) * 100))
              : 0
            return (
              <div
                key={item.key}
                className="flex-1 flex flex-col items-center justify-end h-full group min-w-[1.5rem]"
              >
                {item.value > 0 ? (
                  <span className="text-[10px] text-[var(--admin-fg-muted)] mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {currency}
                    {item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                ) : (
                  <span className="mb-1 h-3" aria-hidden />
                )}
                <div
                  className={`w-full max-w-10 rounded-t-md transition-all ${
                    item.value > 0
                      ? 'bg-[var(--admin-accent)]/80 hover:bg-[var(--admin-accent)]'
                      : 'bg-[var(--admin-border)]'
                  }`}
                  style={{ height: item.value > 0 ? `${pct}%` : '2px' }}
                  title={`${item.label}: ${currency}${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
              </div>
            )
          })}
        </div>
        <div className="flex gap-1.5 sm:gap-2 mt-2">
          {series.map((item) => (
            <div key={`l-${item.key}`} className="flex-1 text-center min-w-[1.5rem]">
              <span className="text-[10px] text-[var(--admin-fg-muted)] truncate block">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RevenueChart

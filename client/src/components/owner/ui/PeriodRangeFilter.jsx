import React, { useMemo } from 'react'
import { FilterBar, SegmentedControl } from './FilterBar'
import { useI18n } from '../../../i18n/I18nContext'

const pad = (n) => String(n).padStart(2, '0')
const isoUtc = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

export const isoDateFromValue = (value) => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return isoUtc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export const rangeForPeriod = (period, now = new Date()) => {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()
  const named = String(period || 'month')

  if (named === 'today') {
    const day = isoUtc(y, m, d)
    return { from: day, to: day }
  }
  if (named === 'week') {
    const weekday = (now.getUTCDay() + 6) % 7
    const start = new Date(Date.UTC(y, m, d - weekday))
    const end = new Date(Date.UTC(y, m, d - weekday + 6))
    return {
      from: isoUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
      to: isoUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    }
  }
  if (named === 'last_month') {
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 0))
    return {
      from: isoUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
      to: isoUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    }
  }
  if (named === 'last_3_months') {
    const start = new Date(Date.UTC(y, m - 2, 1))
    const end = new Date(Date.UTC(y, m + 1, 0))
    return {
      from: isoUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
      to: isoUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    }
  }
  if (named === 'year') {
    return { from: isoUtc(y, 0, 1), to: isoUtc(y, 11, 31) }
  }
  const end = new Date(Date.UTC(y, m + 1, 0))
  return {
    from: isoUtc(y, m, 1),
    to: isoUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  }
}

export const PeriodRangeFilter = ({
  period = 'month',
  from,
  to,
  onChange,
  className = '',
}) => {
  const { t } = useI18n()
  const presets = useMemo(
    () => [
      { id: 'today', label: t('admin.vehicleStats.today') },
      { id: 'week', label: t('admin.vehicleStats.thisWeek') },
      { id: 'month', label: t('admin.vehicleStats.thisMonth') },
      { id: 'last_month', label: t('admin.vehicleStats.lastMonth') },
      { id: 'last_3_months', label: t('admin.vehicleStats.last3Months') },
      { id: 'year', label: t('admin.vehicleStats.thisYear') },
      { id: 'custom', label: t('admin.vehicleStats.customRange') },
    ],
    [t],
  )

  const emit = (nextPeriod, nextFrom, nextTo) => {
    onChange?.({ period: nextPeriod, from: nextFrom, to: nextTo })
  }

  const handlePreset = (id) => {
    if (id === 'custom') {
      emit('custom', from, to)
      return
    }
    const range = rangeForPeriod(id)
    emit(id, range.from, range.to)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <SegmentedControl
        options={presets}
        value={period}
        onChange={handlePreset}
        ariaLabel={t('admin.vehicleStats.periodAria')}
      />
      <FilterBar className="!mb-0">
        <label className="flex items-center gap-2 text-sm text-[var(--admin-fg-secondary)]">
          <span className="whitespace-nowrap font-medium">{t('admin.vehicleStats.from')}</span>
          <input
            type="date"
            className="admin-form-control !min-h-9 w-[11.5rem]"
            value={from || ''}
            max={to || undefined}
            onChange={(e) => emit('custom', e.target.value, to)}
            aria-label={t('admin.vehicleStats.from')}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--admin-fg-secondary)]">
          <span className="whitespace-nowrap font-medium">{t('admin.vehicleStats.to')}</span>
          <input
            type="date"
            className="admin-form-control !min-h-9 w-[11.5rem]"
            value={to || ''}
            min={from || undefined}
            onChange={(e) => emit('custom', from, e.target.value)}
            aria-label={t('admin.vehicleStats.to')}
          />
        </label>
      </FilterBar>
    </div>
  )
}

export default PeriodRangeFilter

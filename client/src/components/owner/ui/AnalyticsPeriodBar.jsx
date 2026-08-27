import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './adminIcons'
import { useI18n } from '../../../i18n/I18nContext'
import { rangeForPeriod, isoDateFromValue } from './periodRangeUtils'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Display ISO date as "01 Aug 2026" (UTC calendar day). */
export const formatAnalyticsDate = (iso) => {
  const s = isoDateFromValue(iso)
  if (!s) return '—'
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return s
  return `${String(d).padStart(2, '0')} ${MONTHS_SHORT[m - 1]} ${y}`
}

const getPortalRoot = () => {
  if (typeof document === 'undefined') return null
  return document.querySelector('.admin-app') || document.body
}

/**
 * Styled date face over a native date input — keeps calendar UX without ugly browser chrome.
 */
const AnalyticsDateField = ({
  label,
  value,
  min,
  max,
  onChange,
  disabled = false,
  active = false,
}) => {
  const inputRef = useRef(null)
  const openPicker = () => {
    if (disabled) return
    const el = inputRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.focus()
  }

  return (
    <button
      type="button"
      className={`admin-analytics-date ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''}`}
      onClick={openPicker}
      disabled={disabled}
      aria-label={label}
    >
      <span className="admin-analytics-date__label">{label}</span>
      <span className="admin-analytics-date__value tabular-nums">{formatAnalyticsDate(value)}</span>
      <Icon name="calendar" className="admin-analytics-date__icon h-3.5 w-3.5" />
      <input
        ref={inputRef}
        type="date"
        className="admin-analytics-date__native"
        value={value || ''}
        min={min || undefined}
        max={max || undefined}
        disabled={disabled}
        tabIndex={-1}
        onChange={(e) => onChange?.(e.target.value)}
        aria-hidden
      />
    </button>
  )
}

/**
 * Premium analytics period control for fleet / vehicle statistics.
 * Presets apply immediately; custom unlocks date fields.
 */
export const AnalyticsPeriodBar = ({
  period = 'month',
  from,
  to,
  onChange,
  className = '',
  compact = false,
}) => {
  const { t } = useI18n()
  const listId = useId()
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 220 })

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

  const selected = presets.find((p) => p.id === period) || presets.find((p) => p.id === 'month')
  const isCustom = period === 'custom'

  const emit = (nextPeriod, nextFrom, nextTo) => {
    onChange?.({ period: nextPeriod, from: nextFrom, to: nextTo })
  }

  const selectPreset = (id) => {
    setMenuOpen(false)
    if (id === 'custom') {
      emit('custom', from, to)
      return
    }
    const range = rangeForPeriod(id)
    emit(id, range.from, range.to)
  }

  useEffect(() => {
    if (!menuOpen || !triggerRef.current) return undefined
    const place = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const width = Math.max(rect.width, 220)
      const left = Math.min(rect.left, window.innerWidth - width - 8)
      setPanelPos({
        top: rect.bottom + 6,
        left: Math.max(8, left),
        width,
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    const onPointer = (e) => {
      const t = e.target
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [menuOpen])

  const portal = getPortalRoot()

  return (
    <div
      ref={rootRef}
      className={`admin-analytics-period ${compact ? 'is-compact' : ''} ${isCustom ? 'is-custom' : ''} ${className}`.trim()}
    >
      <div className="admin-analytics-period__row">
        <div className="admin-analytics-period__preset">
          <span className="admin-analytics-period__eyebrow">{t('admin.vehicleStats.periodLabel')}</span>
          <button
            ref={triggerRef}
            type="button"
            className={`admin-analytics-period__trigger ${menuOpen ? 'is-open' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            aria-controls={listId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="admin-analytics-period__trigger-label">{selected?.label}</span>
            <Icon name="chevron" className="admin-analytics-period__chevron h-3.5 w-3.5" />
          </button>
        </div>

        <div className="admin-analytics-period__range" aria-live="polite">
          {isCustom ? (
            <>
              <AnalyticsDateField
                label={t('admin.vehicleStats.from')}
                value={from}
                max={to}
                active
                onChange={(v) => emit('custom', v, to)}
              />
              <span className="admin-analytics-period__sep" aria-hidden>
                →
              </span>
              <AnalyticsDateField
                label={t('admin.vehicleStats.to')}
                value={to}
                min={from}
                active
                onChange={(v) => emit('custom', from, v)}
              />
            </>
          ) : (
            <button
              type="button"
              className="admin-analytics-period__summary"
              onClick={() => selectPreset('custom')}
              title={t('admin.vehicleStats.editCustomHint')}
            >
              <Icon name="calendar" className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="tabular-nums">
                {formatAnalyticsDate(from)}
                <span className="admin-analytics-period__summary-sep">→</span>
                {formatAnalyticsDate(to)}
              </span>
            </button>
          )}
        </div>
      </div>

      {menuOpen && portal
        ? createPortal(
          <ul
            ref={panelRef}
            id={listId}
            role="listbox"
            aria-label={t('admin.vehicleStats.periodAria')}
            className="admin-analytics-period__menu"
            style={{
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
            }}
          >
            {presets.map((preset) => {
              const active = preset.id === period
              return (
                <li key={preset.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={`admin-analytics-period__option ${active ? 'is-active' : ''}`}
                    onClick={() => selectPreset(preset.id)}
                  >
                    <span>{preset.label}</span>
                    {active ? <span className="admin-analytics-period__check" aria-hidden>✓</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>,
          portal,
        )
        : null}
    </div>
  )
}

export default AnalyticsPeriodBar

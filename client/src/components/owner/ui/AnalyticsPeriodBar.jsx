import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './adminIcons'
import { useI18n } from '../../../i18n/I18nContext'
import { rangeForPeriod, isoDateFromValue } from './periodRangeUtils'
import { DateField } from '../../date/DateField'

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
 * Premium analytics period control for fleet / vehicle statistics.
 * Presets apply immediately; custom unlocks shared HDN date fields.
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

  const selected = presets.find((p) => p.id === period) || presets[0]
  const isCustom = period === 'custom'
  const portal = getPortalRoot()

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
    if (!menuOpen) return undefined
    const update = () => {
      const el = triggerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const width = Math.max(220, rect.width)
      let left = rect.left
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
      setPanelPos({ top: rect.bottom + 6, left, width })
    }
    update()
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

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
              <DateField
                variant="admin"
                className="admin-analytics-period__date"
                label={t('admin.vehicleStats.from')}
                value={from || ''}
                max={to || undefined}
                onChange={(e) => emit('custom', e.target.value, to)}
              />
              <span className="admin-analytics-period__sep" aria-hidden>
                →
              </span>
              <DateField
                variant="admin"
                className="admin-analytics-period__date"
                label={t('admin.vehicleStats.to')}
                value={to || ''}
                min={from || undefined}
                onChange={(e) => emit('custom', from, e.target.value)}
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

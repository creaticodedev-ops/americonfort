import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './adminIcons'
import { useI18n } from '../../../i18n/I18nContext'
import { rangeForPeriod, isoDateFromValue } from './periodRangeUtils'
import { CalendarMonthGrid } from '../../date/CalendarPopover'
import {
  WEEKDAYS,
  MONTHS,
  addMonths,
  formatDisplayDate,
  parseISODate,
  startOfDay,
  toISODate,
  isBeforeDay,
} from '../../date/dateUtils'

const PRIMARY_PRESETS = ['today', 'week', 'month', 'year']
const CUSTOM_QUICK = ['last_month', 'last_3_months']

/** Locale-aware display for analytics ISO dates (UTC calendar day). */
export const formatAnalyticsDate = (iso, language = 'en') => {
  const s = isoDateFromValue(iso)
  if (!s) return '—'
  return formatDisplayDate(s, language) || s
}

const getPortalRoot = () => {
  if (typeof document === 'undefined') return null
  return document.querySelector('.admin-app') || document.body
}

const CalendarGlyph = ({ className = '' }) => (
  <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
)

const Chevron = ({ dir = 'prev' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
  </svg>
)

/**
 * Premium analytics period control.
 * Presets apply immediately. Custom opens an inline range calendar with Apply.
 * Contract unchanged: onChange({ period, from, to })
 */
export const AnalyticsPeriodBar = ({
  period = 'month',
  from,
  to,
  onChange,
  className = '',
  compact = false,
}) => {
  const { t, language } = useI18n()
  const listId = useId()
  const rootRef = useRef(null)
  const customBtnRef = useRef(null)
  const panelRef = useRef(null)
  const [customOpen, setCustomOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(from || '')
  const [draftTo, setDraftTo] = useState(to || '')
  const [hover, setHover] = useState(null)
  const [pickingEnd, setPickingEnd] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => startOfDay(new Date()))
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 320 })

  const portal = getPortalRoot()
  const isCustomLike = period === 'custom' || CUSTOM_QUICK.includes(period)
  const weekdays = WEEKDAYS[language] || WEEKDAYS.en
  const monthNames = MONTHS[language] || MONTHS.en

  const primaryOptions = useMemo(
    () =>
      PRIMARY_PRESETS.map((id) => ({
        id,
        label:
          id === 'today'
            ? t('admin.vehicleStats.today')
            : id === 'week'
              ? t('admin.vehicleStats.thisWeek')
              : id === 'month'
                ? t('admin.vehicleStats.thisMonth')
                : t('admin.vehicleStats.thisYear'),
      })),
    [t],
  )

  const quickOptions = useMemo(
    () =>
      CUSTOM_QUICK.map((id) => ({
        id,
        label:
          id === 'last_month'
            ? t('admin.vehicleStats.lastMonth')
            : t('admin.vehicleStats.last3Months'),
      })),
    [t],
  )

  const emit = (nextPeriod, nextFrom, nextTo) => {
    onChange?.({ period: nextPeriod, from: nextFrom, to: nextTo })
  }

  const selectPreset = (id) => {
    setCustomOpen(false)
    const range = rangeForPeriod(id)
    emit(id, range.from, range.to)
  }

  const openCustom = () => {
    const seedFrom = from || rangeForPeriod('month').from
    const seedTo = to || rangeForPeriod('month').to
    setDraftFrom(seedFrom)
    setDraftTo(seedTo)
    setPickingEnd(false)
    setHover(null)
    setViewMonth(parseISODate(seedFrom) || startOfDay(new Date()))
    setCustomOpen(true)
  }

  const cancelCustom = () => {
    setCustomOpen(false)
    setHover(null)
    setPickingEnd(false)
    setDraftFrom(from || '')
    setDraftTo(to || '')
  }

  const applyCustom = () => {
    const a = isoDateFromValue(draftFrom)
    const b = isoDateFromValue(draftTo)
    if (!a || !b) return
    const fromIso = a <= b ? a : b
    const toIso = a <= b ? b : a
    emit('custom', fromIso, toIso)
    setCustomOpen(false)
    setHover(null)
    setPickingEnd(false)
  }

  const handleDaySelect = (date) => {
    const iso = toISODate(date)
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    if (!pickingEnd || !draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(iso)
      setDraftTo('')
      setPickingEnd(true)
      setHover(null)
      return
    }
    const start = parseISODate(draftFrom)
    if (start && isBeforeDay(date, start)) {
      setDraftFrom(iso)
      setDraftTo('')
      setPickingEnd(true)
      return
    }
    setDraftTo(iso)
    setPickingEnd(false)
    setHover(null)
  }

  useEffect(() => {
    if (!customOpen) return undefined
    const update = () => {
      const el = customBtnRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const width = Math.min(340, window.innerWidth - 16)
      let left = rect.right - width
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < 460 && rect.top > spaceBelow
      setPanelPos({
        top: openUp ? undefined : rect.bottom + 8,
        bottom: openUp ? window.innerHeight - rect.top + 8 : undefined,
        left,
        width,
      })
    }
    update()
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setCustomOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') cancelCustom()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customOpen])

  const rangeLabel = `${formatAnalyticsDate(from, language)} → ${formatAnalyticsDate(to, language)}`
  const draftValid = Boolean(isoDateFromValue(draftFrom) && isoDateFromValue(draftTo))
  const headerLabel = `${monthNames[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`
  const rangeStart = parseISODate(draftFrom)
  const rangeEnd = parseISODate(draftTo)

  return (
    <div
      ref={rootRef}
      className={`admin-period ${compact ? 'is-compact' : ''} ${isCustomLike ? 'is-custom' : ''} ${className}`.trim()}
    >
      <div className="admin-period__bar" role="group" aria-label={t('admin.vehicleStats.periodAria')}>
        <span className="admin-period__icon" aria-hidden>
          <CalendarGlyph />
        </span>

        <div className="admin-period__chips" role="tablist" aria-label={t('admin.vehicleStats.periodLabel')}>
          {primaryOptions.map((opt) => {
            const active = period === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`admin-period__chip${active ? ' is-active' : ''}`}
                onClick={() => selectPreset(opt.id)}
              >
                {opt.label}
              </button>
            )
          })}

          <button
            ref={customBtnRef}
            type="button"
            role="tab"
            aria-selected={isCustomLike}
            aria-expanded={customOpen}
            aria-controls={listId}
            className={`admin-period__chip admin-period__chip--custom${isCustomLike ? ' is-active' : ''}${customOpen ? ' is-open' : ''}`}
            onClick={() => (customOpen ? cancelCustom() : openCustom())}
          >
            {t('admin.vehicleStats.customRange')}
          </button>
        </div>

        <div className="admin-period__summary" aria-live="polite">
          <span className="admin-period__summary-label">{t('admin.vehicleStats.selectedRange')}</span>
          <span className="admin-period__summary-value tabular-nums">{rangeLabel}</span>
        </div>
      </div>

      {customOpen && portal
        ? createPortal(
          <div
            ref={panelRef}
            id={listId}
            className="admin-period__panel"
            role="dialog"
            aria-label={t('admin.vehicleStats.customRange')}
            style={{
              top: panelPos.top,
              bottom: panelPos.bottom,
              left: panelPos.left,
              width: panelPos.width,
            }}
          >
            <div className="admin-period__panel-head">
              <div>
                <p className="admin-period__panel-title">{t('admin.vehicleStats.customRange')}</p>
                <p className="admin-period__panel-sub">{t('admin.vehicleStats.customHint')}</p>
              </div>
              <button
                type="button"
                className="admin-period__icon-btn"
                onClick={cancelCustom}
                aria-label={t('admin.common.close')}
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="admin-period__quick">
              {quickOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`admin-period__quick-btn${period === opt.id ? ' is-active' : ''}`}
                  onClick={() => selectPreset(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="admin-period__draft">
              <button
                type="button"
                className={`admin-period__draft-field${!pickingEnd ? ' is-active' : ''}`}
                onClick={() => setPickingEnd(false)}
              >
                <span className="admin-period__draft-label">{t('admin.vehicleStats.from')}</span>
                <span className="admin-period__draft-value tabular-nums">
                  {formatAnalyticsDate(draftFrom, language)}
                </span>
              </button>
              <span className="admin-period__draft-arrow" aria-hidden>
                →
              </span>
              <button
                type="button"
                className={`admin-period__draft-field${pickingEnd ? ' is-active' : ''}`}
                onClick={() => draftFrom && setPickingEnd(true)}
              >
                <span className="admin-period__draft-label">{t('admin.vehicleStats.to')}</span>
                <span className="admin-period__draft-value tabular-nums">
                  {draftTo ? formatAnalyticsDate(draftTo, language) : '—'}
                </span>
              </button>
            </div>

            <div className="admin-period__cal hdn-cal hdn-cal--admin">
              <div className="hdn-cal__header">
                <button
                  type="button"
                  className="hdn-cal__month-btn"
                  onClick={() => setViewMonth(startOfDay(new Date()))}
                  aria-label={headerLabel}
                >
                  <span className="hdn-cal__month">{headerLabel}</span>
                </button>
                <div className="hdn-cal__nav">
                  <button
                    type="button"
                    className="hdn-cal__nav-btn"
                    onClick={() => setViewMonth((m) => addMonths(m, -1))}
                    aria-label={t('admin.calendar.prev')}
                  >
                    <Chevron dir="prev" />
                  </button>
                  <button
                    type="button"
                    className="hdn-cal__nav-btn"
                    onClick={() => setViewMonth((m) => addMonths(m, 1))}
                    aria-label={t('admin.calendar.next')}
                  >
                    <Chevron dir="next" />
                  </button>
                </div>
              </div>

              <CalendarMonthGrid
                monthDate={viewMonth}
                mode="range"
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                hover={pickingEnd ? hover : null}
                onSelect={handleDaySelect}
                onHover={setHover}
                weekdays={weekdays}
              />

              <div className="admin-period__cal-foot">
                <button
                  type="button"
                  className="admin-period__today-link"
                  onClick={() => {
                    const day = toISODate(startOfDay(new Date()))
                    setDraftFrom(day)
                    setDraftTo(day)
                    setPickingEnd(false)
                    setViewMonth(startOfDay(new Date()))
                  }}
                >
                  {t('admin.vehicleStats.today')}
                </button>
                {(draftFrom || draftTo) && (
                  <button
                    type="button"
                    className="admin-period__today-link"
                    onClick={() => {
                      setDraftFrom('')
                      setDraftTo('')
                      setPickingEnd(false)
                      setHover(null)
                    }}
                  >
                    {t('admin.bookings.clear')}
                  </button>
                )}
              </div>
            </div>

            <div className="admin-period__actions">
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--sm" onClick={cancelCustom}>
                {t('admin.common.cancel')}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--sm"
                disabled={!draftValid}
                onClick={applyCustom}
              >
                {t('admin.vehicleStats.apply')}
              </button>
            </div>
          </div>,
          portal,
        )
        : null}
    </div>
  )
}

export default AnalyticsPeriodBar

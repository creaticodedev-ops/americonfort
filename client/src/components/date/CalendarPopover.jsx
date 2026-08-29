import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  WEEKDAYS,
  MONTHS,
  addMonths,
  formatInputDate,
  isAfterDay,
  isBeforeDay,
  parseDateInput,
  parseISODate,
  sameDay,
  startOfDay,
  toISODate,
  todayISO,
} from './dateUtils'
import './datePicker.css'

const getPortalRoot = () => {
  if (typeof document === 'undefined') return null
  return document.querySelector('.admin-app') || document.body
}

const Chevron = ({ dir = 'prev' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
  </svg>
)

/**
 * Shared premium month grid — single or range selection.
 */
export const CalendarMonthGrid = ({
  monthDate,
  minDate,
  maxDate,
  selected,
  rangeStart,
  rangeEnd,
  hover,
  mode = 'single',
  onSelect,
  onHover,
  weekdays,
  disabledDates,
}) => {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: new Date(year, month - 1, prevDays - startOffset + i + 1), outside: true })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), outside: false })
  }
  while (cells.length % 7 !== 0) {
    const n = cells.length - (startOffset + daysInMonth) + 1
    cells.push({ date: new Date(year, month + 1, n), outside: true })
  }

  const start = mode === 'range' ? rangeStart : selected
  const end = mode === 'range' ? rangeEnd : null
  const rangeEndEffective = mode === 'range' ? (end || hover) : null
  const today = startOfDay(new Date())
  const disabledSet = disabledDates instanceof Set ? disabledDates : null

  return (
    <div className="hdn-cal__grid">
      <div className="hdn-cal__weekdays">
        {weekdays.map((d) => (
          <span key={d} className="hdn-cal__weekday">{d}</span>
        ))}
      </div>
      <div className="hdn-cal__days">
        {cells.map(({ date, outside }, idx) => {
          const iso = toISODate(date)
          const disabled =
            (minDate && isBeforeDay(date, minDate)) ||
            (maxDate && isAfterDay(date, maxDate)) ||
            (disabledSet && disabledSet.has(iso))

          const isStart = sameDay(date, start)
          const isEnd =
            mode === 'range' &&
            (sameDay(date, end) || (!end && hover && sameDay(date, hover) && start && !sameDay(start, hover)))
          const inRange =
            mode === 'range' &&
            start &&
            rangeEndEffective &&
            !sameDay(start, rangeEndEffective) &&
            isAfterDay(date, start) &&
            isBeforeDay(date, rangeEndEffective)
          const isSelected = mode === 'single' ? sameDay(date, selected) : isStart || (isEnd && end)
          const isToday = sameDay(date, today)
          const isSolo = mode === 'range' && isStart && (!rangeEndEffective || sameDay(start, rangeEndEffective))

          const cellClass = [
            'hdn-cal__cell',
            outside ? 'is-outside' : '',
            inRange ? 'is-in-range' : '',
            isStart && rangeEndEffective && !sameDay(start, rangeEndEffective) ? 'is-range-start' : '',
            isEnd && start && !sameDay(start, rangeEndEffective) ? 'is-range-end' : '',
          ]
            .filter(Boolean)
            .join(' ')

          const btnClass = [
            'hdn-cal__day',
            disabled ? 'is-disabled' : '',
            isSelected || (isEnd && !end && hover) ? 'is-selected' : '',
            isSolo ? 'is-solo' : '',
            isToday && !isSelected ? 'is-today' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div key={`${iso}-${idx}`} className={cellClass}>
              <button
                type="button"
                disabled={disabled}
                className={btnClass}
                onClick={() => !disabled && onSelect?.(date)}
                onMouseEnter={() => !disabled && onHover?.(date)}
                onFocus={() => !disabled && onHover?.(date)}
                aria-label={iso}
                aria-pressed={isSelected}
                tabIndex={-1}
              >
                {date.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Premium floating / sheet calendar popover.
 * mode: 'single' | 'range'
 */
export const CalendarPopover = ({
  open,
  onClose,
  anchorRef,
  mode = 'single',
  value,
  startDate,
  endDate,
  onSelect,
  onRangeChange,
  minDate,
  maxDate,
  language = 'en',
  variant = 'public',
  showToday = true,
  showClear = true,
  dualMonth = true,
  title,
  disabledDates,
  labels = {},
  rangeFocus,
  closeOnSelect = true,
  footerSlot = null,
}) => {
  const panelRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [panelStyle, setPanelStyle] = useState({})
  const [hover, setHover] = useState(null)
  const [activeField, setActiveField] = useState('start')
  const [dateDrafts, setDateDrafts] = useState({ single: '', start: '', end: '' })
  const [dateError, setDateError] = useState('')
  const [level, setLevel] = useState('days') // days | months | years
  const [viewMonth, setViewMonth] = useState(() =>
    parseISODate(value || startDate) || startOfDay(new Date()),
  )

  const min = useMemo(() => (minDate ? startOfDay(minDate) : null), [minDate])
  const max = useMemo(() => (maxDate ? startOfDay(maxDate) : null), [maxDate])
  const selected = useMemo(() => parseISODate(value), [value])
  const start = useMemo(() => parseISODate(startDate), [startDate])
  const end = useMemo(() => parseISODate(endDate), [endDate])
  const weekdays = WEEKDAYS[language] || WEEKDAYS.en
  const monthNames = MONTHS[language] || MONTHS.en

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!open) return
    const seed = parseISODate(value || startDate) || startOfDay(new Date())
    setViewMonth(seed)
    if (rangeFocus === 'start' || rangeFocus === 'end') setActiveField(rangeFocus)
    else setActiveField(start && !end ? 'end' : 'start')
    setDateDrafts({
      single: value ? formatInputDate(value) : '',
      start: startDate ? formatInputDate(startDate) : '',
      end: endDate ? formatInputDate(endDate) : '',
    })
    setDateError('')
    setHover(null)
    setLevel('days')
    // Values are intentionally read only when opening or changing the range side.
    // Re-syncing on every keystroke would replace the character being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rangeFocus])

  useEffect(() => {
    if (!open || !isMobile) return undefined
    document.body.classList.add('nav-open')
    return () => document.body.classList.remove('nav-open')
  }, [open, isMobile])

  const updatePosition = () => {
    if (!anchorRef?.current || isMobile) {
      setPanelStyle({})
      return
    }
    const rect = anchorRef.current.getBoundingClientRect()
    const gutter = 12
    const width = Math.min(mode === 'range' && dualMonth && window.innerWidth >= 768 ? 620 : 320, window.innerWidth - gutter * 2)
    let left = rect.left
    left = Math.max(gutter, Math.min(left, window.innerWidth - width - gutter))
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 380 && rect.top > spaceBelow
    setPanelStyle({
      position: 'fixed',
      left,
      width,
      top: openUp ? undefined : rect.bottom + 8,
      bottom: openUp ? window.innerHeight - rect.top + 8 : undefined,
      zIndex: 90,
    })
  }

  useLayoutEffect(() => {
    if (!open) return undefined
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isMobile, mode, dualMonth])

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (anchorRef?.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      onClose?.()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  const dateErrorText = (reason) => {
    if (reason === 'bounds') return labels.dateOutOfRange || 'Choose a date within the allowed range.'
    if (reason === 'disabled') return labels.dateUnavailable || 'That date is unavailable.'
    if (reason === 'start-required') return labels.startRequired || 'Choose a start date first.'
    return labels.invalidDate || 'Enter a valid date.'
  }

  const isSelectable = (date) => {
    if (!date) return { ok: false, reason: 'invalid' }
    if ((min && isBeforeDay(date, min)) || (max && isAfterDay(date, max))) {
      return { ok: false, reason: 'bounds' }
    }
    if (disabledDates instanceof Set && disabledDates.has(toISODate(date))) {
      return { ok: false, reason: 'disabled' }
    }
    return { ok: true }
  }

  const setDraftForField = (field, text) => {
    setDateDrafts((drafts) => ({ ...drafts, [field]: text }))
    if (dateError) setDateError('')
  }

  const commitTypedDate = (field, text = dateDrafts[field]) => {
    const parsed = parseDateInput(text, language)
    const availability = isSelectable(parsed)
    if (!availability.ok) {
      setDateError(field)
      return false
    }

    const iso = toISODate(parsed)
    setViewMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
    setDateDrafts((drafts) => ({ ...drafts, [field]: formatInputDate(iso) }))
    setDateError('')

    if (mode === 'single') {
      onSelect?.(iso)
      return true
    }

    if (field === 'start') {
      onRangeChange?.({ startDate: iso, endDate: '' })
      setActiveField('end')
      setHover(null)
      return true
    }

    if (!start) {
      setDateError('start-required')
      return false
    }
    if (start && isBeforeDay(parsed, start)) {
      setDateError('bounds')
      return false
    }
    onRangeChange?.({ startDate: toISODate(start), endDate: iso })
    setHover(null)
    return true
  }

  const handleDaySelect = (date) => {
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    const iso = toISODate(date)
    if (mode === 'single') {
      setDraftForField('single', formatInputDate(iso))
      onSelect?.(iso)
      if (closeOnSelect) onClose?.()
      return
    }
    if (activeField === 'start' || !start || (start && end)) {
      setDraftForField('start', formatInputDate(iso))
      setDraftForField('end', '')
      onRangeChange?.({ startDate: iso, endDate: '' })
      setActiveField('end')
      setHover(null)
      return
    }
    if (isBeforeDay(date, start)) {
      setDraftForField('start', formatInputDate(iso))
      setDraftForField('end', '')
      onRangeChange?.({ startDate: iso, endDate: '' })
      setActiveField('end')
      return
    }
    setDraftForField('end', formatInputDate(iso))
    onRangeChange?.({ startDate: toISODate(start), endDate: iso })
    setHover(null)
    setTimeout(() => onClose?.(), 140)
  }

  const clear = () => {
    if (mode === 'single') onSelect?.('')
    else onRangeChange?.({ startDate: '', endDate: '' })
    setDateDrafts({ single: '', start: '', end: '' })
    setDateError('')
    setActiveField('start')
    setHover(null)
  }

  const jumpToday = () => {
    const t = startOfDay(new Date())
    if (min && isBeforeDay(t, min)) return
    if (max && isAfterDay(t, max)) return
    setViewMonth(t)
    if (mode === 'single') {
      onSelect?.(todayISO())
      setDraftForField('single', formatInputDate(todayISO()))
      if (closeOnSelect) onClose?.()
    }
  }

  const headerLabel =
    level === 'years'
      ? `${Math.floor(viewMonth.getFullYear() / 12) * 12} – ${Math.floor(viewMonth.getFullYear() / 12) * 12 + 11}`
      : level === 'months'
        ? String(viewMonth.getFullYear())
        : `${monthNames[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`

  const shiftView = (dir) => {
    if (level === 'years') {
      setViewMonth((m) => new Date(m.getFullYear() + dir * 12, m.getMonth(), 1))
      return
    }
    if (level === 'months') {
      setViewMonth((m) => new Date(m.getFullYear() + dir, m.getMonth(), 1))
      return
    }
    setViewMonth((m) => addMonths(m, dir))
  }

  const yearBase = Math.floor(viewMonth.getFullYear() / 12) * 12
  const rootClass = `hdn-cal ${variant === 'admin' ? 'hdn-cal--admin' : 'hdn-cal--public'}`

  const body = (
    <div
      ref={panelRef}
      style={isMobile ? undefined : panelStyle}
      className={
        isMobile
          ? `${rootClass} hdn-cal--sheet`
          : `${rootClass} hdn-cal--popover`
      }
      onClick={isMobile ? () => onClose?.() : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={title || labels.calendar || 'Calendar'}
    >
      <div className="hdn-cal__panel" onClick={(e) => e.stopPropagation()}>
        {isMobile ? <div className="hdn-cal__handle" aria-hidden /> : null}

        <div className="hdn-cal__header">
          <div className="hdn-cal__header-text">
            {title ? <p className="hdn-cal__eyebrow">{title}</p> : null}
            <button
              type="button"
              className="hdn-cal__month-btn"
              onClick={() => setLevel((l) => (l === 'days' ? 'months' : l === 'months' ? 'years' : 'days'))}
              aria-label={headerLabel}
            >
              <span className="hdn-cal__month">{headerLabel}</span>
              <svg className="hdn-cal__month-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          <div className="hdn-cal__nav">
            <button
              type="button"
              className="hdn-cal__nav-btn"
              onClick={() => shiftView(-1)}
              aria-label={labels.prev || 'Previous'}
            >
              <Chevron dir="prev" />
            </button>
            <button
              type="button"
              className="hdn-cal__nav-btn"
              onClick={() => shiftView(1)}
              aria-label={labels.next || 'Next'}
            >
              <Chevron dir="next" />
            </button>
          </div>
        </div>

        <div className={`hdn-cal__date-inputs ${mode === 'range' ? 'is-range' : ''}`}>
          {(mode === 'range' ? ['start', 'end'] : ['single']).map((field) => {
            const isActive = mode === 'single' || activeField === field
            const fieldLabel = mode === 'range'
              ? (field === 'start' ? labels.from || 'From' : labels.to || 'To')
              : labels.date || 'Date'
            const placeholder = labels.datePlaceholder || 'DD/MM/YYYY'
            return (
              <label key={field} className={`hdn-cal__date-input-wrap ${isActive ? 'is-active' : ''}`}>
                <span className="hdn-cal__date-input-label">{fieldLabel}</span>
                <input
                  className="hdn-cal__date-input"
                  value={dateDrafts[field]}
                  placeholder={placeholder}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={Boolean(dateError === field || dateError === 'invalid')}
                  aria-label={fieldLabel}
                  onFocus={(e) => {
                    if (mode === 'range') setActiveField(field)
                    setDateError('')
                    e.currentTarget.select()
                  }}
                  onChange={(e) => {
                    const next = e.target.value
                    setDraftForField(field, next)
                    if (parseDateInput(next, language)) commitTypedDate(field, next)
                  }}
                  onBlur={() => {
                    if (dateDrafts[field].trim()) commitTypedDate(field)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const committed = commitTypedDate(field)
                      const isCompleteRange = mode === 'range' && field === 'end'
                      if (committed && closeOnSelect && (mode === 'single' || isCompleteRange)) {
                        onClose?.()
                      }
                    }
                  }}
                />
              </label>
            )
          })}
        </div>
        {dateError ? (
          <p className="hdn-cal__date-error" role="alert">{dateErrorText(dateError)}</p>
        ) : null}

        {level === 'years' ? (
          <div className="hdn-cal__picker-grid" role="listbox" aria-label="Year">
            {Array.from({ length: 12 }, (_, i) => yearBase + i).map((y) => (
              <button
                key={y}
                type="button"
                role="option"
                aria-selected={y === viewMonth.getFullYear()}
                className={`hdn-cal__picker-item ${y === viewMonth.getFullYear() ? 'is-selected' : ''}`}
                onClick={() => {
                  setViewMonth(new Date(y, viewMonth.getMonth(), 1))
                  setLevel('months')
                }}
              >
                {y}
              </button>
            ))}
          </div>
        ) : null}

        {level === 'months' ? (
          <div className="hdn-cal__picker-grid" role="listbox" aria-label="Month">
            {monthNames.map((name, idx) => (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={idx === viewMonth.getMonth()}
                className={`hdn-cal__picker-item ${idx === viewMonth.getMonth() ? 'is-selected' : ''}`}
                onClick={() => {
                  setViewMonth(new Date(viewMonth.getFullYear(), idx, 1))
                  setLevel('days')
                }}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        ) : null}

        {level === 'days' ? (
          <div className={`hdn-cal__months ${mode === 'range' && dualMonth && !isMobile ? 'is-dual' : ''}`}>
            <CalendarMonthGrid
              monthDate={viewMonth}
              minDate={min}
              maxDate={max}
              selected={selected}
              rangeStart={start}
              rangeEnd={end}
              hover={mode === 'range' && activeField === 'end' ? hover : null}
              mode={mode}
              onSelect={handleDaySelect}
              onHover={setHover}
              weekdays={weekdays}
              disabledDates={disabledDates}
            />
            {mode === 'range' && dualMonth && !isMobile ? (
              <CalendarMonthGrid
                monthDate={addMonths(viewMonth, 1)}
                minDate={min}
                maxDate={max}
                selected={selected}
                rangeStart={start}
                rangeEnd={end}
                hover={activeField === 'end' ? hover : null}
                mode={mode}
                onSelect={handleDaySelect}
                onHover={setHover}
                weekdays={weekdays}
                disabledDates={disabledDates}
              />
            ) : null}
          </div>
        ) : null}

        {footerSlot ? <div className="hdn-cal__slot">{footerSlot}</div> : null}

        <div className="hdn-cal__footer">
          <div className="hdn-cal__footer-start">
            {showClear ? (
              <button type="button" className="hdn-cal__link" onClick={clear}>
                {labels.clear || 'Clear'}
              </button>
            ) : null}
            {showToday && level === 'days' ? (
              <button type="button" className="hdn-cal__link" onClick={jumpToday}>
                {labels.today || 'Today'}
              </button>
            ) : null}
          </div>
          <button type="button" className="hdn-cal__done" onClick={() => onClose?.()}>
            {labels.done || 'Done'}
          </button>
        </div>
      </div>
    </div>
  )

  const portal = getPortalRoot()
  return portal ? createPortal(body, portal) : body
}

export default CalendarPopover

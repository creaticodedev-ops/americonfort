import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  WEEKDAYS,
  MONTHS,
  addMonths,
  isAfterDay,
  isBeforeDay,
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
                tabIndex={disabled ? -1 : 0}
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
}) => {
  const panelRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [panelStyle, setPanelStyle] = useState({})
  const [hover, setHover] = useState(null)
  const [activeField, setActiveField] = useState('start')
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
    setHover(null)
    setLevel('days')
  }, [open, value, startDate, endDate, start, end, rangeFocus])

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

  const handleDaySelect = (date) => {
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    if (mode === 'single') {
      onSelect?.(toISODate(date))
      onClose?.()
      return
    }
    if (activeField === 'start' || !start || (start && end)) {
      onRangeChange?.({ startDate: toISODate(date), endDate: '' })
      setActiveField('end')
      setHover(null)
      return
    }
    if (isBeforeDay(date, start)) {
      onRangeChange?.({ startDate: toISODate(date), endDate: '' })
      setActiveField('end')
      return
    }
    onRangeChange?.({ startDate: toISODate(start), endDate: toISODate(date) })
    setHover(null)
    setTimeout(() => onClose?.(), 140)
  }

  const clear = () => {
    if (mode === 'single') onSelect?.('')
    else onRangeChange?.({ startDate: '', endDate: '' })
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
      onClose?.()
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

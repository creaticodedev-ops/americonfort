import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nContext'

const WEEKDAYS = {
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
}

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
}

const pad = (n) => String(n).padStart(2, '0')

export const toISODate = (date) => {
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const parseISODate = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return null
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setHours(0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const addMonths = (date, count) => new Date(date.getFullYear(), date.getMonth() + count, 1)

const sameDay = (a, b) =>
  Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate())

const isBeforeDay = (a, b) => a.getTime() < b.getTime()
const isAfterDay = (a, b) => a.getTime() > b.getTime()

const formatShort = (iso, language) => {
  const d = parseISODate(iso)
  if (!d) return ''
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB'
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

const MonthGrid = ({
  monthDate,
  minDate,
  maxDate,
  start,
  end,
  hover,
  onSelect,
  onHover,
  weekdays,
  monthNames,
}) => {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day))

  const rangeEnd = end || hover

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <p className="font-display text-[1.35rem] text-ink leading-none">
          {monthNames[month]}
        </p>
        <p className="mt-1 text-xs tracking-[0.12em] text-muted uppercase">{year}</p>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekdays.map((d) => (
          <div key={d} className="h-8 text-[11px] font-medium tracking-wide text-muted flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="h-9 sm:h-10" />

          const disabled = isBeforeDay(date, minDate) || (maxDate && isAfterDay(date, maxDate))
          const isStart = sameDay(date, start)
          const isEnd = sameDay(date, end) || (!end && hover && sameDay(date, hover) && start && !sameDay(start, hover))
          const inRange =
            start &&
            rangeEnd &&
            !sameDay(start, rangeEnd) &&
            isAfterDay(date, start) &&
            isBeforeDay(date, rangeEnd)
          const isToday = sameDay(date, startOfDay(new Date()))
          const isSolo = isStart && (!rangeEnd || sameDay(start, rangeEnd))

          let shape = 'rounded-full'
          if (isStart && rangeEnd && !sameDay(start, rangeEnd)) shape = 'rounded-l-full rounded-r-none'
          if (isEnd && start && !sameDay(start, rangeEnd)) shape = 'rounded-r-full rounded-l-none'
          if (isSolo) shape = 'rounded-full'
          if (inRange) shape = 'rounded-none'

          return (
            <div
              key={toISODate(date)}
              className={`relative h-9 sm:h-10 flex items-center justify-center ${inRange ? 'bg-primary/10' : ''} ${
                isStart && rangeEnd && !sameDay(start, rangeEnd) ? 'bg-primary/10 rounded-l-full' : ''
              } ${isEnd && start && !sameDay(start, rangeEnd) ? 'bg-primary/10 rounded-r-full' : ''}`}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelect(date)}
                onMouseEnter={() => !disabled && onHover(date)}
                className={[
                  'h-9 w-9 sm:h-10 sm:w-10 text-sm flex items-center justify-center transition-all duration-150 select-none',
                  shape,
                  disabled
                    ? 'text-[#C8C0BA] line-through decoration-[#D5CDC8] cursor-not-allowed'
                    : 'cursor-pointer hover:bg-sand text-ink',
                  (isStart || (isEnd && end) || (isEnd && !end && hover))
                    ? 'bg-primary text-white hover:bg-primary-dull font-semibold shadow-sm'
                    : '',
                  isToday && !isStart && !isEnd && !disabled
                    ? 'ring-1 ring-inset ring-primary/50'
                    : '',
                ].join(' ')}
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
 * Premium dual-field date range picker with portaled calendar (never clipped).
 */
const DateRangePicker = ({
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
  pickupLabel,
  returnLabel,
  className = '',
}) => {
  const { t, language } = useI18n()
  const [open, setOpen] = useState(false)
  const [activeField, setActiveField] = useState('start') // start | end
  const [viewMonth, setViewMonth] = useState(() => parseISODate(startDate) || startOfDay(new Date()))
  const [hover, setHover] = useState(null)
  const [panelStyle, setPanelStyle] = useState({})
  const [isMobile, setIsMobile] = useState(false)

  const wrapRef = useRef(null)
  const panelRef = useRef(null)

  const min = useMemo(() => startOfDay(minDate || new Date()), [minDate])
  const max = useMemo(() => (maxDate ? startOfDay(maxDate) : null), [maxDate])
  const start = useMemo(() => parseISODate(startDate), [startDate])
  const end = useMemo(() => parseISODate(endDate), [endDate])
  const weekdays = WEEKDAYS[language] || WEEKDAYS.en
  const monthNames = MONTHS[language] || MONTHS.en

  useEffect(() => {
    // Sheet on phones only; tablets/desktop use anchored dual-month popover
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!open || !isMobile) return
    document.body.classList.add('nav-open')
    return () => document.body.classList.remove('nav-open')
  }, [open, isMobile])

  const updatePosition = () => {
    if (!wrapRef.current || isMobile) {
      setPanelStyle({})
      return
    }
    const rect = wrapRef.current.getBoundingClientRect()
    const gutter = 16
    const dualMonth = window.innerWidth >= 768
    const width = Math.min(dualMonth ? 680 : 360, Math.max(320, window.innerWidth - gutter * 2))
    let left = rect.left + rect.width / 2 - width / 2
    left = Math.max(gutter, Math.min(left, window.innerWidth - width - gutter))
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < 420 && rect.top > spaceBelow

    setPanelStyle({
      position: 'fixed',
      left,
      width,
      maxWidth: `calc(100vw - ${gutter * 2}px)`,
      top: openUp ? undefined : rect.bottom + 10,
      bottom: openUp ? window.innerHeight - rect.top + 10 : undefined,
      zIndex: 80,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, isMobile])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      setOpen(false)
      setHover(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setHover(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openCalendar = (field) => {
    setActiveField(field)
    setViewMonth(start || startOfDay(new Date()))
    setOpen(true)
  }

  const handleSelect = (date) => {
    if (isBeforeDay(date, min)) return
    if (max && isAfterDay(date, max)) return

    if (activeField === 'start' || !start || (start && end)) {
      onChange({ startDate: toISODate(date), endDate: '' })
      setActiveField('end')
      setHover(null)
      return
    }

    if (isBeforeDay(date, start)) {
      onChange({ startDate: toISODate(date), endDate: '' })
      setActiveField('end')
      return
    }

    onChange({ startDate: toISODate(start), endDate: toISODate(date) })
    setHover(null)
    setTimeout(() => setOpen(false), 160)
  }

  const clearDates = (e) => {
    e.stopPropagation()
    onChange({ startDate: '', endDate: '' })
    setActiveField('start')
    setHover(null)
  }

  const nights =
    start && end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000)) : 0

  const fieldBase =
    'flex-1 min-w-0 px-4 py-3.5 text-left transition-colors duration-200 cursor-pointer rounded-xl md:rounded-none'

  const calendarPanel = open && (
    <div
      ref={panelRef}
      style={isMobile ? undefined : panelStyle}
      className={
        isMobile
          ? 'fixed inset-0 z-[80] flex flex-col justify-end bg-ink/40 backdrop-blur-[2px]'
          : 'date-range-popover'
      }
      onClick={isMobile ? () => setOpen(false) : undefined}
    >
      <div
        className={
          isMobile
            ? 'bg-white rounded-t-3xl p-4 sm:p-5 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[88svh] overflow-y-auto shadow-2xl'
            : 'rounded-2xl border border-borderColor bg-white p-4 sm:p-5 shadow-[0_24px_60px_-20px_rgba(22,18,16,0.35)] max-h-[min(560px,calc(100vh-24px))] overflow-y-auto'
        }
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile && (
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-borderColor" />
        )}

        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
              {activeField === 'end' ? t('hero.selectReturn') : t('hero.selectPickup')}
            </p>
            {nights > 0 && (
              <p className="text-sm text-ink mt-1 font-medium truncate">{t('hero.nights', { count: nights })}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className="h-9 w-9 rounded-xl border border-borderColor hover:bg-sand flex items-center justify-center cursor-pointer"
              aria-label="Previous month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="h-9 w-9 rounded-xl border border-borderColor hover:bg-sand flex items-center justify-center cursor-pointer"
              aria-label="Next month"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <MonthGrid
            monthDate={viewMonth}
            minDate={min}
            maxDate={max}
            start={start}
            end={end}
            hover={activeField === 'end' ? hover : null}
            onSelect={handleSelect}
            onHover={setHover}
            weekdays={weekdays}
            monthNames={monthNames}
          />
          <div className="hidden md:block">
            <MonthGrid
              monthDate={addMonths(viewMonth, 1)}
              minDate={min}
              maxDate={max}
              start={start}
              end={end}
              hover={activeField === 'end' ? hover : null}
              onSelect={handleSelect}
              onHover={setHover}
              weekdays={weekdays}
              monthNames={monthNames}
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-borderColor flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={clearDates}
            className="text-sm text-muted hover:text-ink transition-colors cursor-pointer"
          >
            {t('hero.clear')}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dull text-white text-sm font-medium transition-colors cursor-pointer"
          >
            {t('hero.done')}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <div className="flex flex-col md:flex-row md:items-stretch">
        <button
          type="button"
          onClick={() => openCalendar('start')}
          className={`${fieldBase} ${open && activeField === 'start' ? 'bg-sand/70' : 'hover:bg-sand/40'}`}
        >
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted font-medium mb-1">
            {pickupLabel || t('hero.pickupDate')}
          </p>
          <p className={`text-sm truncate ${startDate ? 'text-ink font-medium' : 'text-muted'}`}>
            {startDate ? formatShort(startDate, language) : t('hero.selectPickup')}
          </p>
        </button>

        <div className="hidden md:block w-px bg-borderColor my-3" />

        <button
          type="button"
          onClick={() => openCalendar(start ? 'end' : 'start')}
          className={`${fieldBase} ${open && activeField === 'end' ? 'bg-sand/70' : 'hover:bg-sand/40'}`}
        >
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted font-medium mb-1">
            {returnLabel || t('hero.returnDate')}
          </p>
          <p className={`text-sm truncate ${endDate ? 'text-ink font-medium' : 'text-muted'}`}>
            {endDate ? formatShort(endDate, language) : t('hero.selectReturn')}
          </p>
        </button>
      </div>

      {open && createPortal(calendarPanel, document.body)}
    </div>
  )
}

export default DateRangePicker

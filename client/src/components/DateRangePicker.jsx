import React, { useMemo, useRef, useState } from 'react'
import { CalendarPopover } from './date/CalendarPopover'
import { formatDisplayDate, parseISODate, startOfDay } from './date/dateUtils'
import { useI18n } from '../i18n/I18nContext'

export { toISODate, parseISODate } from './date/dateUtils'

/**
 * Premium dual-field date range picker (public booking + shared calendar skin).
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
  variant = 'public',
}) => {
  const { t, language } = useI18n()
  const [open, setOpen] = useState(false)
  const [activeField, setActiveField] = useState('start')
  const wrapRef = useRef(null)

  const min = useMemo(() => startOfDay(minDate || new Date()), [minDate])
  const max = useMemo(() => (maxDate ? startOfDay(maxDate) : null), [maxDate])
  const start = useMemo(() => parseISODate(startDate), [startDate])
  const end = useMemo(() => parseISODate(endDate), [endDate])

  const nights =
    start && end ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000)) : 0

  const openCalendar = (field) => {
    setActiveField(field)
    setOpen(true)
  }

  const fieldBase =
    'flex-1 min-w-0 px-4 py-3.5 text-left transition-colors duration-200 cursor-pointer rounded-xl md:rounded-none'

  return (
    <div className={`relative hdn-date-range hdn-date-range--${variant} ${className}`} ref={wrapRef}>
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
            {startDate ? formatDisplayDate(startDate, language) : t('hero.selectPickup')}
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
            {endDate ? formatDisplayDate(endDate, language) : t('hero.selectReturn')}
          </p>
        </button>
      </div>

      <CalendarPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={wrapRef}
        mode="range"
        startDate={startDate}
        endDate={endDate}
        onRangeChange={onChange}
        minDate={min}
        maxDate={max}
        language={language}
        variant={variant}
        dualMonth
        rangeFocus={activeField}
        title={
          nights > 0
            ? t('hero.nights', { count: nights })
            : activeField === 'end'
              ? t('hero.selectReturn')
              : t('hero.selectPickup')
        }
        labels={{
          clear: t('hero.clear'),
          today: t('admin.vehicleStats.today') || 'Today',
          done: t('hero.done'),
          prev: 'Previous month',
          next: 'Next month',
          calendar: 'Calendar',
        }}
      />
    </div>
  )
}

export default DateRangePicker

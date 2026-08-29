import React, { useId, useMemo, useRef, useState } from 'react'
import { CalendarPopover } from './CalendarPopover'
import {
  formatDisplayDateTime,
  mergeDateTimeValue,
  parseISODate,
  splitDateTimeValue,
} from './dateUtils'
import { TimeField } from './TimeField'
import { useI18n } from '../../i18n/I18nContext'
import './datePicker.css'

/**
 * Premium date+time field — replaces native <input type="datetime-local">.
 * value / onChange use the same datetime-local string shape: YYYY-MM-DDTHH:mm
 */
export const DateTimeField = ({
  label,
  value = '',
  onChange,
  min,
  max,
  disabled = false,
  clearable = true,
  showToday = true,
  variant = 'admin',
  className = '',
  id,
  name,
  placeholder,
  required = false,
  'aria-label': ariaLabel,
}) => {
  const { t, language } = useI18n()
  const autoId = useId()
  const fieldId = id || autoId
  const anchorRef = useRef(null)
  const [open, setOpen] = useState(false)

  const { date, time } = useMemo(() => splitDateTimeValue(value), [value])

  const emit = (nextDate, nextTime) => {
    if (!onChange) return
    const next = mergeDateTimeValue(nextDate, nextTime)
    onChange({
      target: { value: next, name: name || '' },
      currentTarget: { value: next, name: name || '' },
    })
  }

  const minDate = useMemo(() => {
    const s = splitDateTimeValue(min)
    return parseISODate(s.date) || undefined
  }, [min])

  const maxDate = useMemo(() => {
    const s = splitDateTimeValue(max)
    return parseISODate(s.date) || undefined
  }, [max])

  const display = value
    ? formatDisplayDateTime(value, language)
    : (placeholder || t('admin.datePicker.selectDateTime') || 'Select date & time')

  const timeSlot = (
    <TimeField
      value={time}
      disabled={!date}
      onChange={(e) => emit(date || splitDateTimeValue(value).date, e.target.value)}
      onEnter={() => setOpen(false)}
    />
  )

  return (
    <div className={`hdn-date-field hdn-date-field--${variant} hdn-date-field--datetime ${className}`.trim()} ref={anchorRef}>
      {label ? (
        <label className="hdn-date-field__label" htmlFor={fieldId}>
          {label}
          {required ? <span className="admin-form-required" aria-hidden> *</span> : null}
        </label>
      ) : null}
      <button
        type="button"
        id={fieldId}
        name={name}
        disabled={disabled}
        className={`hdn-date-field__trigger ${open ? 'is-open' : ''} ${value ? 'has-value' : ''}`}
        onClick={() => !disabled && setOpen(true)}
        aria-label={ariaLabel || label || t('admin.datePicker.selectDateTime') || 'Select date & time'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required || undefined}
      >
        <span className="hdn-date-field__value tabular-nums">{display}</span>
        <svg className="hdn-date-field__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
          <circle cx="12" cy="16" r="1.25" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {/* Keep required validation working without native datetime UI */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden
        required={required}
        value={value || ''}
        onChange={() => {}}
        className="hdn-date-field__native-mirror"
      />

      <CalendarPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        mode="single"
        value={date}
        onSelect={(iso) => emit(iso, time)}
        minDate={minDate}
        maxDate={maxDate}
        language={language}
        variant={variant}
        showToday={showToday}
        showClear={clearable}
        dualMonth={false}
        closeOnSelect={false}
        footerSlot={timeSlot}
        labels={{
          clear: t('admin.datePicker.clear') || t('hero.clear') || 'Clear',
          today: t('admin.datePicker.today') || t('admin.vehicleStats.today') || 'Today',
          done: t('admin.datePicker.done') || t('hero.done') || 'Done',
          prev: t('admin.datePicker.prevMonth') || 'Previous month',
          next: t('admin.datePicker.nextMonth') || 'Next month',
          calendar: t('admin.datePicker.calendar') || 'Calendar',
        }}
      />
    </div>
  )
}

export default DateTimeField

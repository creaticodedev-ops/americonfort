import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CalendarPopover } from './CalendarPopover'
import {
  formatDisplayDateTime,
  mergeDateTimeValue,
  parseISODate,
  splitDateTimeValue,
} from './dateUtils'
import { useI18n } from '../../i18n/I18nContext'
import './datePicker.css'

const TimeInput = ({ value, min, max, disabled, label, onCommit }) => {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(value)
  }, [focused, value])

  const isValid = (text) => {
    const numeric = Number(text)
    return /^\d{1,2}$/.test(text) && numeric >= min && numeric <= max
  }

  const commit = (text) => {
    if (!isValid(text)) return false
    const normalized = String(Number(text)).padStart(2, '0')
    setDraft(normalized)
    onCommit(normalized)
    return true
  }

  const adjust = (amount) => {
    const current = Number(draft)
    const next = Number.isFinite(current)
      ? (current + amount + max + 1) % (max + 1)
      : min
    commit(String(next))
  }

  return (
    <input
      className="hdn-cal__time-input"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={draft}
      disabled={disabled}
      aria-label={label}
      aria-invalid={draft.length === 2 && !isValid(draft)}
      onFocus={(e) => {
        setFocused(true)
        e.currentTarget.select()
      }}
      onChange={(e) => {
        const next = e.target.value.replace(/\D/g, '').slice(0, 2)
        setDraft(next)
        if (next.length === 2) commit(next)
      }}
      onBlur={() => {
        setFocused(false)
        if (!commit(draft)) setDraft(value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          adjust(e.key === 'ArrowUp' ? 1 : -1)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          commit(draft)
        }
      }}
    />
  )
}

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
  const hour = time.slice(0, 2)
  const minute = time.slice(3, 5)

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
    <div className="hdn-cal__time">
      <p className="hdn-cal__time-label">{t('admin.datePicker.time') || 'Time'}</p>
      <div className="hdn-cal__time-row">
        <label className="hdn-cal__time-select-wrap">
          <span className="sr-only">{t('admin.datePicker.hour') || 'Hour'}</span>
          <TimeInput
            value={hour}
            min={0}
            max={23}
            disabled={!date}
            label={t('admin.datePicker.hour') || 'Hour'}
            onCommit={(next) => emit(date || splitDateTimeValue(value).date, `${next}:${minute}`)}
          />
        </label>
        <span className="hdn-cal__time-sep" aria-hidden>:</span>
        <label className="hdn-cal__time-select-wrap">
          <span className="sr-only">{t('admin.datePicker.minute') || 'Minute'}</span>
          <TimeInput
            value={minute}
            min={0}
            max={59}
            disabled={!date}
            label={t('admin.datePicker.minute') || 'Minute'}
            onCommit={(next) => emit(date || splitDateTimeValue(value).date, `${hour}:${next}`)}
          />
        </label>
      </div>
    </div>
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

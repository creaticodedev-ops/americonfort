import React, { useId, useRef, useState } from 'react'
import { CalendarPopover } from './CalendarPopover'
import { formatDisplayDate, parseISODate } from './dateUtils'
import { useI18n } from '../../i18n/I18nContext'
import './datePicker.css'

/**
 * Premium single-date field — replaces native <input type="date">.
 * value / onChange use ISO strings (YYYY-MM-DD), same as native date inputs.
 */
export const DateField = ({
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

  const handleSelect = (iso) => {
    if (!onChange) return
    onChange({
      target: { value: iso, name: name || '' },
      currentTarget: { value: iso, name: name || '' },
    })
  }

  const display = value
    ? formatDisplayDate(value, language)
    : (placeholder || t('admin.datePicker.selectDate') || 'Select date')

  return (
    <div className={`hdn-date-field hdn-date-field--${variant} ${className}`.trim()} ref={anchorRef}>
      {label ? (
        <label className="hdn-date-field__label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      <button
        type="button"
        id={fieldId}
        name={name}
        disabled={disabled}
        className={`hdn-date-field__trigger ${open ? 'is-open' : ''} ${value ? 'has-value' : ''}`}
        onClick={() => !disabled && setOpen(true)}
        aria-label={ariaLabel || label || t('admin.datePicker.selectDate')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required || undefined}
      >
        <span className="hdn-date-field__value tabular-nums">{display}</span>
        <svg className="hdn-date-field__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      <CalendarPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        mode="single"
        value={value}
        onSelect={handleSelect}
        minDate={parseISODate(min) || undefined}
        maxDate={parseISODate(max) || undefined}
        language={language}
        variant={variant}
        showToday={showToday}
        showClear={clearable}
        dualMonth={false}
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

export default DateField

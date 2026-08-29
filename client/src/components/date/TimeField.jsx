import React, { useEffect, useRef, useState } from 'react'
import { pad2 } from './dateUtils'
import { useI18n } from '../../i18n/I18nContext'
import './datePicker.css'

const normalizeTime = (value) => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{1,2})$/)
  if (!match) return ''
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return ''
  return `${pad2(hour)}:${pad2(minute)}`
}

const TimeSegment = ({
  value,
  min,
  max,
  label,
  part,
  disabled,
  inputRef,
  nextRef,
  onCommit,
  onComposite,
  onEnter,
}) => {
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
    const normalized = pad2(Number(text))
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

  const handleComposite = (raw) => {
    const [hourPart, minutePart] = raw.split(':')
    const time = normalizeTime(`${hourPart}:${minutePart}`)
    if (!time || !onComposite) return false
    const [hour, minute] = time.split(':')
    onComposite(hour, minute)
    setDraft(part === 'minute' ? minute : hour)
    return true
  }

  return (
    <input
      ref={inputRef}
      className="hdn-cal__time-input"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={5}
      value={draft}
      disabled={disabled}
      aria-label={label}
      aria-invalid={draft.length === 2 && !isValid(draft)}
      onFocus={(e) => {
        setFocused(true)
        e.currentTarget.select()
      }}
      onChange={(e) => {
        const raw = e.target.value
        if (raw.includes(':') && handleComposite(raw)) {
          nextRef?.current?.focus()
          return
        }
        if (part === 'hour' && raw.endsWith(':')) {
          const hourPart = raw.slice(0, -1)
          if (commit(hourPart)) nextRef?.current?.focus()
          return
        }
        const next = raw.replace(/\D/g, '').slice(0, 2)
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
          if (commit(draft)) onEnter?.()
        }
      }}
    />
  )
}

/**
 * Shared 24-hour time control for date-time pickers and time-only settings.
 * Values stay in the existing HH:mm shape.
 */
export const TimeField = ({
  value = '10:00',
  onChange,
  disabled = false,
  className = '',
  label,
  showLabel = true,
  onEnter,
}) => {
  const { t } = useI18n()
  const hourRef = useRef(null)
  const minuteRef = useRef(null)
  const normalized = normalizeTime(value) || '10:00'
  const [hour, minute] = normalized.split(':')
  const timeLabel = label || t('admin.datePicker.time') || 'Time'
  const hourLabel = t('admin.datePicker.hour') || 'Hour'
  const minuteLabel = t('admin.datePicker.minute') || 'Minute'

  const emit = (nextHour, nextMinute) => {
    onChange?.({
      target: { value: `${nextHour}:${nextMinute}` },
      currentTarget: { value: `${nextHour}:${nextMinute}` },
    })
  }

  return (
    <div className={`hdn-time-field hdn-cal__time ${className}`.trim()}>
      {showLabel ? <p className="hdn-cal__time-label">{timeLabel}</p> : null}
      <div className="hdn-cal__time-row">
        <label className="hdn-cal__time-select-wrap">
          <span className="hdn-cal__time-segment-label">{hourLabel}</span>
          <TimeSegment
            inputRef={hourRef}
            nextRef={minuteRef}
            value={hour}
            min={0}
            max={23}
            part="hour"
            disabled={disabled}
            label={hourLabel}
            onCommit={(next) => emit(next, minute)}
            onComposite={emit}
            onEnter={onEnter}
          />
        </label>
        <span className="hdn-cal__time-sep" aria-hidden>:</span>
        <label className="hdn-cal__time-select-wrap">
          <span className="hdn-cal__time-segment-label">{minuteLabel}</span>
          <TimeSegment
            inputRef={minuteRef}
            value={minute}
            min={0}
            max={59}
            part="minute"
            disabled={disabled}
            label={minuteLabel}
            onCommit={(next) => emit(hour, next)}
            onComposite={emit}
            onEnter={onEnter}
          />
        </label>
      </div>
    </div>
  )
}

export default TimeField

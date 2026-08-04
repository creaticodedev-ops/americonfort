import React, { useMemo } from 'react'
import DateRangePicker, { toISODate, parseISODate } from '../DateRangePicker'
import { useI18n } from '../../i18n/I18nContext'

const splitDateTime = (value) => {
  if (!value) return { date: '', time: '10:00' }
  const local = String(value).slice(0, 16)
  if (local.includes('T')) {
    const [date, time] = local.split('T')
    return { date, time: time || '10:00' }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(local)) return { date: local, time: '10:00' }
  return { date: '', time: '10:00' }
}

const mergeDateTime = (date, time) => (date ? `${date}T${time || '10:00'}` : '')

const TIME_OPTIONS = (() => {
  const out = []
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return out
})()

const TimeSelect = ({ label, value, onChange, id }) => {
  const { t } = useI18n()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200/90 bg-gray-50/50 px-3 transition focus-within:border-primary/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm ring-1 ring-gray-100">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent py-2 text-sm text-ink focus:outline-none focus:ring-0"
        >
          {TIME_OPTIONS.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
        <span className="text-[10px] uppercase tracking-wide text-gray-400">{t('carDetails.timeLabel')}</span>
      </div>
    </div>
  )
}

/** Premium date range (calendar) + pickup/return time selectors */
export default function ReservationDateTimes({
  pickupDate,
  returnDate,
  setPickupDate,
  setReturnDate,
  minDate,
}) {
  const { t } = useI18n()
  const pickup = useMemo(() => splitDateTime(pickupDate), [pickupDate])
  const ret = useMemo(() => splitDateTime(returnDate), [returnDate])

  const startISO = pickup.date
  const endISO = ret.date

  const handleRangeChange = ({ startDate, endDate }) => {
    if (startDate) {
      setPickupDate(mergeDateTime(startDate, pickup.time))
    } else {
      setPickupDate('')
    }
    if (endDate) {
      setReturnDate(mergeDateTime(endDate, ret.time))
    } else if (startDate && !endDate) {
      setReturnDate('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm">
        <DateRangePicker
          startDate={startISO}
          endDate={endISO}
          onChange={handleRangeChange}
          minDate={minDate}
          pickupLabel={t('carDetails.pickupDate')}
          returnLabel={t('carDetails.returnDate')}
          className="w-full"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TimeSelect
          id="pickup-time"
          label={t('carDetails.pickupTime')}
          value={pickup.time}
          onChange={(time) => {
            if (pickup.date) setPickupDate(mergeDateTime(pickup.date, time))
          }}
        />
        <TimeSelect
          id="return-time"
          label={t('carDetails.returnTime')}
          value={ret.time}
          onChange={(time) => {
            if (ret.date) setReturnDate(mergeDateTime(ret.date, time))
          }}
        />
      </div>
    </div>
  )
}

export { splitDateTime, mergeDateTime, parseISODate, toISODate }

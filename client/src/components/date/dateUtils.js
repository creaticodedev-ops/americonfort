/** Shared ISO date helpers for HDN calendars (local calendar days). */

export const pad2 = (n) => String(n).padStart(2, '0')

export const toISODate = (date) => {
  if (!date) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export const parseISODate = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return null
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  date.setHours(0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

export const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export const addMonths = (date, count) => new Date(date.getFullYear(), date.getMonth() + count, 1)

export const sameDay = (a, b) =>
  Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate())

export const isBeforeDay = (a, b) => a.getTime() < b.getTime()
export const isAfterDay = (a, b) => a.getTime() > b.getTime()

export const WEEKDAYS = {
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  es: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
  ar: ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'],
}

export const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
}

export const formatDisplayDate = (iso, language = 'en') => {
  const d = parseISODate(iso)
  if (!d) return ''
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'ar' ? 'ar' : 'en-GB'
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

const normalizeMonthName = (value) =>
  String(value || '')
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/**
 * Parse the human-friendly formats accepted by the shared calendar.
 * Numeric input follows the app's day-first convention; ISO remains supported.
 * Returns a local-calendar Date or null without rolling invalid dates over.
 */
export const parseDateInput = (value, language = 'en') => {
  const raw = String(value || '').trim()
  if (!raw) return null
  const iso = parseISODate(raw)
  if (iso) return iso

  let day
  let month
  let year
  const numeric = raw.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/)
  const longYearFirst = raw.match(/^(\d{4})[/. -](\d{1,2})[/. -](\d{1,2})$/)
  const compact = raw.match(/^(\d{2})(\d{2})(\d{4})$/)

  if (numeric) {
    [, day, month, year] = numeric.map(Number)
  } else if (longYearFirst) {
    [, year, month, day] = longYearFirst.map(Number)
  } else if (compact) {
    [, day, month, year] = compact.map(Number)
  } else {
    const named = raw.match(/^(\d{1,2})\s+([^\d\s]+)\s+(\d{4})$/)
    if (!named) return null
    day = Number(named[1])
    year = Number(named[3])
    const wanted = normalizeMonthName(named[2])
    const names = [...(MONTHS[language] || MONTHS.en), ...MONTHS.en]
    month = names.findIndex((name) => {
      const normalized = normalizeMonthName(name)
      return normalized === wanted || normalized.slice(0, 3) === wanted.slice(0, 3)
    }) % 12 + 1
    if (!month) return null
  }

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  date.setHours(0, 0, 0, 0)
  return date
}

export const todayISO = () => toISODate(startOfDay(new Date()))

/** Split datetime-local / ISO-ish values into date + HH:mm (local). */
export const splitDateTimeValue = (value) => {
  if (!value) return { date: '', time: '10:00' }
  const raw = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    return { date: raw.slice(0, 10), time: raw.slice(11, 16) }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { date: raw, time: '10:00' }
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return { date: '', time: '10:00' }
  return {
    date: toISODate(d),
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  }
}

export const mergeDateTimeValue = (date, time) => {
  if (!date) return ''
  const hhmm = /^\d{2}:\d{2}$/.test(String(time || '')) ? time : '10:00'
  return `${date}T${hhmm}`
}

export const formatDisplayDateTime = (value, language = 'en') => {
  const { date, time } = splitDateTimeValue(value)
  if (!date) return ''
  return `${formatDisplayDate(date, language)} · ${time}`
}

export const HOURS_24 = Array.from({ length: 24 }, (_, i) => pad2(i))
export const MINUTES_60 = Array.from({ length: 60 }, (_, i) => pad2(i))

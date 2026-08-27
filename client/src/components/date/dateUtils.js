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

const pad = (n) => String(n).padStart(2, '0')
const isoUtc = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

export const isoDateFromValue = (value) => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return isoUtc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export const rangeForPeriod = (period, now = new Date()) => {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()
  const named = String(period || 'month')

  if (named === 'today') {
    const day = isoUtc(y, m, d)
    return { from: day, to: day }
  }
  if (named === 'week') {
    const weekday = (now.getUTCDay() + 6) % 7
    const start = new Date(Date.UTC(y, m, d - weekday))
    const end = new Date(Date.UTC(y, m, d - weekday + 6))
    return {
      from: isoUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
      to: isoUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    }
  }
  if (named === 'last_month') {
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 0))
    return {
      from: isoUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
      to: isoUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    }
  }
  if (named === 'last_3_months') {
    const start = new Date(Date.UTC(y, m - 2, 1))
    const end = new Date(Date.UTC(y, m + 1, 0))
    return {
      from: isoUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
      to: isoUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
    }
  }
  if (named === 'year') {
    return { from: isoUtc(y, 0, 1), to: isoUtc(y, 11, 31) }
  }
  const end = new Date(Date.UTC(y, m + 1, 0))
  return {
    from: isoUtc(y, m, 1),
    to: isoUtc(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  }
}

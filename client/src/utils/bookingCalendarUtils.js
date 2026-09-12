/** Pure helpers for the owner reservation calendar (no API / business mutations). */

export const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export const endOfDay = (d) => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export const sameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export const isSameMonth = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const vehicleLabel = (booking) => {
  const brand = booking?.car?.brand || ''
  const model = booking?.car?.model || ''
  const label = `${brand} ${model}`.trim()
  return label || booking?.reservationId || '—'
}

export const carKey = (booking) => {
  if (booking?.car?._id) return String(booking.car._id)
  if (booking?.car) return String(booking.car)
  return `orphan:${booking?._id || 'x'}`
}

export const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && aEnd >= bStart

/** Bookings active on a local calendar day (inclusive pickup → return). */
export const bookingsOnDay = (bookings, date) => {
  const dayStart = startOfDay(date)
  const dayEnd = endOfDay(date)
  return (bookings || []).filter((b) => {
    const start = new Date(b.pickupDate)
    const end = new Date(b.returnDate)
    return start <= dayEnd && end >= dayStart
  })
}

export const isPickupDay = (booking, date) => sameDay(new Date(booking.pickupDate), date)
export const isReturnDay = (booking, date) => sameDay(new Date(booking.returnDate), date)

/**
 * Same-vehicle overlaps (active rentals that conflict).
 * Returns Set of booking _id strings involved in at least one conflict.
 */
export const detectConflictIds = (bookings = []) => {
  const byCar = new Map()
  for (const b of bookings) {
    const key = carKey(b)
    if (!byCar.has(key)) byCar.set(key, [])
    byCar.get(key).push(b)
  }
  const conflicted = new Set()
  for (const list of byCar.values()) {
    if (list.length < 2) continue
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i]
        const b = list[j]
        if (
          rangesOverlap(
            new Date(a.pickupDate),
            new Date(a.returnDate),
            new Date(b.pickupDate),
            new Date(b.returnDate),
          )
        ) {
          conflicted.add(String(a._id))
          conflicted.add(String(b._id))
        }
      }
    }
  }
  return conflicted
}

/** Status → CSS tone token used by calendar chips */
export const statusTone = (status) => {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'pending'
  if (s === 'ready_for_pickup') return 'ready'
  if (s === 'confirmed' || s === 'paid' || s === 'signed') return 'confirmed'
  if (s === 'active') return 'active'
  if (s === 'completed') return 'completed'
  if (s === 'cancelled' || s === 'failed') return 'danger'
  return 'muted'
}

/** Density level 0–4 for heat styling */
export const densityLevel = (count) => {
  if (!count) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

/** Build a 6×7 month grid including leading/trailing days */
export const buildMonthGrid = (year, monthIndex /* 0-based */) => {
  const first = new Date(year, monthIndex, 1)
  const startPad = first.getDay()
  const gridStart = addDays(first, -startPad)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export const weekStartingSunday = (cursor) => {
  const start = startOfDay(cursor)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Unique vehicles with bookings intersecting [rangeStart, rangeEnd] */
export const vehiclesInRange = (bookings, rangeStart, rangeEnd) => {
  const map = new Map()
  for (const b of bookings) {
    const start = new Date(b.pickupDate)
    const end = new Date(b.returnDate)
    if (!rangesOverlap(start, end, rangeStart, rangeEnd)) continue
    const key = carKey(b)
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: vehicleLabel(b),
        bookings: [],
      })
    }
    map.get(key).bookings.push(b)
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
}

export const localeTag = (language) => {
  if (language === 'fr') return 'fr-FR'
  if (language === 'es') return 'es-ES'
  if (language === 'ar') return 'ar'
  return 'en-US'
}

export const formatShortTime = (value, language) => {
  try {
    return new Date(value).toLocaleTimeString(localeTag(language), {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export const formatDayMonth = (value, language) => {
  try {
    return new Date(value).toLocaleDateString(localeTag(language), {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return ''
  }
}

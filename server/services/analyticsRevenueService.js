/**
 * Owner revenue analytics — same recognition & period rules as vehicle-stats.
 * Revenue = bookingRecognizedRevenue (ledger charges − refunds, else booking.price),
 * attributed to calendar ranges via proratedRevenue (rental overlap).
 */
import Booking from '../models/Booking.js'
import Car from '../models/Car.js'
import {
  REVENUE_BOOKING_STATUSES,
  bookingOverlapsRange,
  bookingRecognizedRevenue,
  buildTrendSeries,
  inclusiveUtcDays,
  proratedRevenue,
  resolveStatsPeriod,
  toUtcEnd,
  toUtcStart,
} from './vehicleStatsService.js'

const MS_DAY = 86400000
const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100

const asObjectId = (id) => {
  if (!id) return null
  return id
}

const pctChange = (current, previous) => {
  const cur = Number(current) || 0
  const prev = Number(previous) || 0
  if (prev === 0) return cur > 0 ? null : 0
  return Math.round(((cur - prev) / prev) * 1000) / 10
}

const addUtcDays = (date, days) => new Date(date.getTime() + days * MS_DAY)

/** Previous window with the same semantics as resolveStatsPeriod for named periods. */
export const previousEquivalentRange = (range, period = 'custom', now = new Date()) => {
  const named = String(period || range?.label || 'custom').toLowerCase()
  if (named === 'today') {
    return resolveStatsPeriod('today', null, null, addUtcDays(toUtcStart(now), -1))
  }
  if (named === 'week') {
    return resolveStatsPeriod('week', null, null, addUtcDays(toUtcStart(now), -7))
  }
  if (named === 'month') {
    const pivot = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15))
    return resolveStatsPeriod('month', null, null, pivot)
  }
  if (named === 'year') {
    const pivot = new Date(Date.UTC(now.getUTCFullYear() - 1, 6, 1))
    return resolveStatsPeriod('year', null, null, pivot)
  }
  if (named === 'last_month') {
    const pivot = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15))
    return resolveStatsPeriod('last_month', null, null, pivot)
  }
  if (named === 'last_3_months') {
    const pivot = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 15))
    return resolveStatsPeriod('last_3_months', null, null, pivot)
  }

  const days = Math.max(1, inclusiveUtcDays(range.from, range.to))
  const prevTo = toUtcEnd(addUtcDays(toUtcStart(range.from), -1))
  const prevFrom = toUtcStart(addUtcDays(toUtcStart(range.from), -days))
  return {
    from: prevFrom,
    to: prevTo,
    label: 'previous',
    periodDays: inclusiveUtcDays(prevFrom, prevTo),
  }
}

const sumProrated = (bookings, range) =>
  roundMoney(bookings.reduce((sum, booking) => sum + proratedRevenue(booking, range), 0))

const channelOf = (booking) => (booking?.channel === 'walk_in' ? 'walk_in' : 'online')

const summarizeRange = (bookings, range) => {
  const overlapping = bookings.filter((b) => bookingOverlapsRange(b, range))
  const revenueBookings = overlapping.filter((b) => REVENUE_BOOKING_STATUSES.includes(b.status))
  const revenue = sumProrated(bookings, range)
  const online = sumProrated(
    revenueBookings.filter((b) => channelOf(b) === 'online'),
    range,
  )
  const walkIn = sumProrated(
    revenueBookings.filter((b) => channelOf(b) === 'walk_in'),
    range,
  )
  const paidCount = revenueBookings.filter((b) => b.paymentStatus === 'paid').length
  const amountPaid = roundMoney(
    revenueBookings.reduce((sum, b) => sum + (Number(b.financial?.paymentsTotal) || 0), 0),
  )
  return {
    revenue,
    rentals: revenueBookings.length,
    bookingCount: revenueBookings.length,
    onlineRevenue: online,
    walkInRevenue: walkIn,
    onlineBookingCount: revenueBookings.filter((b) => channelOf(b) === 'online').length,
    walkInBookingCount: revenueBookings.filter((b) => channelOf(b) === 'walk_in').length,
    paidCount,
    amountPaid,
    averageRevenuePerRental: revenueBookings.length
      ? roundMoney(revenue / revenueBookings.length)
      : 0,
  }
}

const groupByKey = (bookings, range, keyFn, labelFn) => {
  const map = new Map()
  for (const booking of bookings) {
    if (!REVENUE_BOOKING_STATUSES.includes(booking.status)) continue
    if (!bookingOverlapsRange(booking, range)) continue
    const key = keyFn(booking)
    if (key == null || key === '') continue
    const cur = map.get(key) || { key, label: labelFn(booking, key), revenue: 0, rentals: 0 }
    cur.revenue = roundMoney(cur.revenue + proratedRevenue(booking, range))
    cur.rentals += 1
    map.set(key, cur)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}

export const buildOwnerRevenueAnalytics = async (
  ownerId,
  { period = 'month', from, to, now = new Date() } = {},
) => {
  const owner = asObjectId(ownerId)
  const range = resolveStatsPeriod(period, from, to, now)
  const prevRange = previousEquivalentRange(range, period, now)

  const todayRange = resolveStatsPeriod('today', null, null, now)
  const yesterdayRange = previousEquivalentRange(todayRange, 'today', now)
  const weekRange = resolveStatsPeriod('week', null, null, now)
  const prevWeekRange = previousEquivalentRange(weekRange, 'week', now)
  const monthRange = resolveStatsPeriod('month', null, null, now)
  const prevMonthRange = previousEquivalentRange(monthRange, 'month', now)
  const yearRange = resolveStatsPeriod('year', null, null, now)
  const prevYearRange = previousEquivalentRange(yearRange, 'year', now)

  const twelveMonthsAgo = resolveStatsPeriod(
    'custom',
    toUtcStart(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)))
      .toISOString()
      .slice(0, 10),
    toUtcStart(now).toISOString().slice(0, 10),
    now,
  )
  const eightWeeksAgoStart = addUtcDays(toUtcStart(now), -7 * 7)
  const eightWeeksRange = {
    from: eightWeeksAgoStart,
    to: toUtcEnd(now),
    label: 'weeks',
    periodDays: inclusiveUtcDays(eightWeeksAgoStart, toUtcEnd(now)),
  }
  const fiveYearsStart = new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1))
  const fiveYearsRange = {
    from: fiveYearsStart,
    to: toUtcEnd(now),
    label: 'years',
    periodDays: inclusiveUtcDays(fiveYearsStart, toUtcEnd(now)),
  }

  const [bookings, cars] = await Promise.all([
    Booking.find({ owner })
      .select(
        'car pickupDate returnDate price priceBreakdown status customerName paymentStatus financial channel pickupLocation createdAt',
      )
      .lean(),
    Car.find({ owner }).select('brand model licensePlate category').lean(),
  ])

  const carMap = new Map(cars.map((c) => [String(c._id), c]))
  const revenueBookings = bookings.filter((b) => REVENUE_BOOKING_STATUSES.includes(b.status))

  const periodSummary = summarizeRange(bookings, range)
  const prevSummary = summarizeRange(bookings, prevRange)
  const todaySummary = summarizeRange(bookings, todayRange)
  const yesterdaySummary = summarizeRange(bookings, yesterdayRange)
  const weekSummary = summarizeRange(bookings, weekRange)
  const prevWeekSummary = summarizeRange(bookings, prevWeekRange)
  const monthSummary = summarizeRange(bookings, monthRange)
  const prevMonthSummary = summarizeRange(bookings, prevMonthRange)
  const yearSummary = summarizeRange(bookings, yearRange)
  const prevYearSummary = summarizeRange(bookings, prevYearRange)

  const lifetimeRevenue = roundMoney(
    revenueBookings.reduce((sum, b) => sum + bookingRecognizedRevenue(b), 0),
  )
  const lifetimeOnline = roundMoney(
    revenueBookings
      .filter((b) => channelOf(b) === 'online')
      .reduce((sum, b) => sum + bookingRecognizedRevenue(b), 0),
  )
  const lifetimeWalkIn = roundMoney(
    revenueBookings
      .filter((b) => channelOf(b) === 'walk_in')
      .reduce((sum, b) => sum + bookingRecognizedRevenue(b), 0),
  )

  const outstandingCandidates = bookings.filter((b) => {
    if (b.status === 'cancelled') return false
    const due = Number(b.financial?.balanceDue) || 0
    if (due > 0) return true
    return ['pending', 'failed'].includes(b.paymentStatus) && Number(b.price) > 0
  })
  const outstanding = {
    count: outstandingCandidates.length,
    balanceDue: roundMoney(
      outstandingCandidates.reduce((sum, b) => {
        const due = Number(b.financial?.balanceDue) || 0
        if (due > 0) return sum + due
        if (['pending', 'failed'].includes(b.paymentStatus)) return sum + (Number(b.price) || 0)
        return sum
      }, 0),
    ),
    amountPaid: roundMoney(
      outstandingCandidates.reduce((sum, b) => sum + (Number(b.financial?.paymentsTotal) || 0), 0),
    ),
  }

  const topVehicles = groupByKey(
    bookings,
    range,
    (b) => (b.car ? String(b.car) : null),
    (b, key) => {
      const car = carMap.get(key)
      return car ? `${car.brand || ''} ${car.model || ''}`.trim() : key
    },
  )
    .slice(0, 5)
    .map((row) => {
      const car = carMap.get(row.key)
      return {
        carId: row.key,
        brand: car?.brand || '',
        model: car?.model || '',
        licensePlate: car?.licensePlate || '',
        category: car?.category || '',
        revenue: row.revenue,
        rentals: row.rentals,
      }
    })

  const byCategory = groupByKey(
    bookings,
    range,
    (b) => {
      if (!b.car) return 'Other'
      return carMap.get(String(b.car))?.category || 'Other'
    },
    (_b, key) => key,
  )
    .slice(0, 10)
    .map((row) => ({ category: row.label, revenue: row.revenue, rentals: row.rentals }))

  const byLocation = groupByKey(
    bookings,
    range,
    (b) => (b.pickupLocation ? String(b.pickupLocation).trim() : null),
    (_b, key) => key,
  )
    .slice(0, 8)
    .map((row) => ({ location: row.label, revenue: row.revenue, rentals: row.rentals }))

  const byChannel = [
    {
      _id: 'online',
      count: periodSummary.onlineBookingCount,
      revenue: periodSummary.onlineRevenue,
    },
    {
      _id: 'walk_in',
      count: periodSummary.walkInBookingCount,
      revenue: periodSummary.walkInRevenue,
    },
  ].filter((row) => row.count > 0 || row.revenue > 0)

  const statusMap = new Map()
  for (const booking of bookings) {
    const key = booking.status || 'unknown'
    const cur = statusMap.get(key) || { _id: key, count: 0, revenue: 0 }
    cur.count += 1
    if (REVENUE_BOOKING_STATUSES.includes(booking.status) && bookingOverlapsRange(booking, range)) {
      cur.revenue = roundMoney(cur.revenue + proratedRevenue(booking, range))
    }
    statusMap.set(key, cur)
  }
  const byStatus = [...statusMap.values()].sort((a, b) => b.count - a.count)

  const payMap = new Map()
  for (const booking of bookings) {
    if (!REVENUE_BOOKING_STATUSES.includes(booking.status)) continue
    if (!bookingOverlapsRange(booking, range)) continue
    const key = booking.paymentStatus || 'pending'
    const cur = payMap.get(key) || { _id: key, count: 0, revenue: 0 }
    cur.count += 1
    cur.revenue = roundMoney(cur.revenue + proratedRevenue(booking, range))
    payMap.set(key, cur)
  }
  const byPaymentStatus = [...payMap.values()].sort((a, b) => b.revenue - a.revenue)

  const monthlyTrend = buildTrendSeries(revenueBookings, twelveMonthsAgo, 'monthly').map((row) => ({
    key: row.key,
    label: row.label,
    amount: row.amount,
    count: row.bookings,
  }))
  const weeklyTrend = buildTrendSeries(revenueBookings, eightWeeksRange, 'weekly').map((row) => ({
    key: row.key,
    label: row.label,
    amount: row.amount,
    count: row.bookings,
  }))
  const yearlyTrend = buildTrendSeries(revenueBookings, fiveYearsRange, 'monthly')
    .reduce((acc, row) => {
      const y = String(row.key).slice(0, 4)
      const cur = acc.get(y) || { key: y, label: y, amount: 0, count: 0 }
      cur.amount = roundMoney(cur.amount + row.amount)
      cur.count += row.bookings || 0
      acc.set(y, cur)
      return acc
    }, new Map())

  const periodTrendGrain =
    range.periodDays <= 14 ? 'daily' : range.periodDays <= 90 ? 'weekly' : 'monthly'
  const periodTrend = buildTrendSeries(revenueBookings, range, periodTrendGrain).map((row) => ({
    key: row.key,
    label: row.label,
    amount: row.amount,
    count: row.bookings,
  }))

  return {
    attribution: 'rental_overlap',
    period: {
      label: range.label,
      from: toUtcStart(range.from).toISOString().slice(0, 10),
      to: toUtcStart(range.to).toISOString().slice(0, 10),
      days: range.periodDays,
      ...periodSummary,
      prevRevenue: prevSummary.revenue,
    },
    windows: {
      today: todaySummary.revenue,
      yesterday: yesterdaySummary.revenue,
      week: weekSummary.revenue,
      prevWeek: prevWeekSummary.revenue,
      month: monthSummary.revenue,
      prevMonth: prevMonthSummary.revenue,
      year: yearSummary.revenue,
      prevYear: prevYearSummary.revenue,
      monthBookingCount: monthSummary.bookingCount,
    },
    lifetime: {
      revenue: lifetimeRevenue,
      bookingCount: revenueBookings.length,
      paidBookingCount: revenueBookings.filter((b) => b.paymentStatus === 'paid').length,
      onlineRevenue: lifetimeOnline,
      walkInRevenue: lifetimeWalkIn,
      onlineBookingCount: revenueBookings.filter((b) => channelOf(b) === 'online').length,
      walkInBookingCount: revenueBookings.filter((b) => channelOf(b) === 'walk_in').length,
      averageRevenuePerRental: revenueBookings.length
        ? roundMoney(lifetimeRevenue / revenueBookings.length)
        : 0,
    },
    outstanding,
    comparisons: {
      periodVsPrev: pctChange(periodSummary.revenue, prevSummary.revenue),
      todayVsYesterday: pctChange(todaySummary.revenue, yesterdaySummary.revenue),
      weekVsPrev: pctChange(weekSummary.revenue, prevWeekSummary.revenue),
      monthVsPrev: pctChange(monthSummary.revenue, prevMonthSummary.revenue),
      yearVsPrev: pctChange(yearSummary.revenue, prevYearSummary.revenue),
    },
    // Backward-compatible flat fields (semantics: rental-attributed)
    todayRevenue: todaySummary.revenue,
    yesterdayRevenue: yesterdaySummary.revenue,
    weeklyRevenue: weekSummary.revenue,
    prevWeeklyRevenue: prevWeekSummary.revenue,
    monthlyRevenue: monthSummary.revenue,
    prevMonthlyRevenue: prevMonthSummary.revenue,
    yearlyRevenue: yearSummary.revenue,
    prevYearlyRevenue: prevYearSummary.revenue,
    monthBookingCount: monthSummary.bookingCount,
    periodRevenue: periodSummary.revenue,
    totalRevenue: lifetimeRevenue,
    bookingCount: revenueBookings.length,
    paidBookingCount: revenueBookings.filter((b) => b.paymentStatus === 'paid').length,
    averageRevenuePerRental: periodSummary.averageRevenuePerRental,
    onlineRevenue: periodSummary.onlineRevenue,
    walkInRevenue: periodSummary.walkInRevenue,
    onlineBookingCount: periodSummary.onlineBookingCount,
    walkInBookingCount: periodSummary.walkInBookingCount,
    monthlyTrend,
    weeklyTrend,
    yearlyTrend: [...yearlyTrend.values()],
    periodTrend,
    periodTrendGrain,
    byStatus,
    byChannel,
    byPaymentStatus,
    byCategory,
    byLocation,
    topVehicles,
  }
}

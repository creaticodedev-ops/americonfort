/**
 * Vehicle / fleet statistics regression suite.
 *   node scripts/verify-vehicle-stats-period.mjs
 */
import assert from 'node:assert/strict'
import {
  resolveStatsPeriod,
  bookingOverlapsRange,
  computeVehiclePeriodMetrics,
  suggestedTrendGrain,
  toIsoDate,
  proratedRevenue,
  isBookingCurrentlyOnRent,
  uniqueRentalDaysInRange,
  bookingCalendarDays,
  bookingRecognizedRevenue,
  occupiedDayIsos,
  inclusiveUtcDays,
} from '../services/vehicleStatsService.js'
import { calcRentalDays } from '../utils/helpers.js'

const now = new Date('2026-08-25T19:23:00.000Z') // 21:23 UTC+2 — one hour before sample pickup

console.log('[1] presets')
{
  const month = resolveStatsPeriod('month', null, null, now)
  assert.equal(toIsoDate(month.from), '2026-08-01')
  assert.equal(toIsoDate(month.to), '2026-08-31')
  assert.equal(month.periodDays, 31)

  const last = resolveStatsPeriod('last_month', null, null, now)
  assert.equal(toIsoDate(last.from), '2026-07-01')
  assert.equal(toIsoDate(last.to), '2026-07-31')

  const custom = resolveStatsPeriod('custom', '2026-08-01', '2026-08-03', now)
  assert.equal(custom.periodDays, 3)
}

console.log('[2] rental-day rule: 10 Aug → 15 Aug = 5 days (matches calcRentalDays)')
{
  const start = new Date('2026-08-10T10:00:00.000Z')
  const end = new Date('2026-08-15T10:00:00.000Z')
  assert.equal(calcRentalDays(start, end), 5)
  assert.equal(occupiedDayIsos(start, end).length, 5)
  assert.deepEqual(occupiedDayIsos(start, end), [
    '2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14',
  ])
  // Inclusive calendar would wrongly return 6
  assert.equal(inclusiveUtcDays(start, end), 6)
}

console.log('[3] Vehicle A scenario — deterministic rental days')
{
  const range = resolveStatsPeriod('custom', '2026-08-01', '2026-08-31', now)
  const bookings = [
    { pickupDate: '2026-08-01T08:00:00.000Z', returnDate: '2026-08-05T08:00:00.000Z', status: 'completed', price: 1200, priceBreakdown: { days: 4 } },
    { pickupDate: '2026-08-10T08:00:00.000Z', returnDate: '2026-08-15T08:00:00.000Z', status: 'completed', price: 1500, priceBreakdown: { days: 5 } },
    { pickupDate: '2026-08-20T08:00:00.000Z', returnDate: '2026-08-22T08:00:00.000Z', status: 'completed', price: 600, priceBreakdown: { days: 2 } },
    { pickupDate: '2026-08-12T08:00:00.000Z', returnDate: '2026-08-14T08:00:00.000Z', status: 'cancelled', price: 999 },
    { pickupDate: '2026-08-18T08:00:00.000Z', returnDate: '2026-08-25T08:00:00.000Z', status: 'active', price: 2100, priceBreakdown: { days: 7 } },
    { pickupDate: '2026-08-28T08:00:00.000Z', returnDate: '2026-08-30T08:00:00.000Z', status: 'confirmed', price: 600, priceBreakdown: { days: 2 } },
  ]
  // 01–05=4, 10–15=5, active 18–25=7 overlaps completed 20–22, upcoming 28–30=2
  const days = uniqueRentalDaysInRange(bookings, range)
  assert.equal(days, 4 + 5 + 7 + 2) // 20–22 absorbed into active window
  const metrics = computeVehiclePeriodMetrics({
    car: { status: 'available', isAvaliable: true },
    bookings,
    maintenance: [{ scheduledDate: '2026-08-06T00:00:00.000Z', completedDate: '2026-08-08T00:00:00.000Z', status: 'completed' }],
    range,
    now,
  })
  assert.equal(metrics.cancellations, 1)
  assert.equal(metrics.completedRentals, 3)
  assert.equal(metrics.activeRentals, 1)
  assert.equal(metrics.upcomingRentals, 1)
  assert.equal(metrics.totalRentals, 5) // excludes cancelled
  assert.equal(metrics.rentalDays, days)
  assert.equal(metrics.unavailableDays, 2) // Aug 6–7 half-open to Aug 8
  assert.equal(metrics.currentlyRented, true)
  assert.equal(metrics.availability, 'rented')
  // Cancelled must not add revenue; completed+active+upcoming confirmed
  assert.equal(metrics.revenue, 1200 + 1500 + 600 + 2100 + 600)
}

console.log('[4] cancelled / outside range / cross-month proration')
{
  const range = resolveStatsPeriod('custom', '2026-08-01', '2026-08-31', now)
  const car = { _id: 'c1', status: 'available', isAvaliable: true, pricePerDay: 300 }
  const bookings = [
    {
      pickupDate: '2026-08-01T08:00:00.000Z',
      returnDate: '2026-08-11T08:00:00.000Z',
      status: 'completed',
      price: 3000,
      priceBreakdown: { days: 10 },
    },
    {
      pickupDate: '2026-08-20T08:00:00.000Z',
      returnDate: '2026-08-22T08:00:00.000Z',
      status: 'cancelled',
      price: 600,
      priceBreakdown: { days: 2 },
    },
    {
      pickupDate: '2026-07-30T08:00:00.000Z',
      returnDate: '2026-08-02T08:00:00.000Z',
      status: 'completed',
      price: 900,
      priceBreakdown: { days: 3 },
    },
  ]
  assert.equal(bookingOverlapsRange(bookings[2], range), true)
  const metrics = computeVehiclePeriodMetrics({ car, bookings, maintenance: [], range, now })
  assert.equal(metrics.cancellations, 1)
  assert.equal(metrics.completedRentals, 2)
  assert.equal(metrics.totalRentals, 2)
  // Cross-month: occupied Jul30,Jul31,Aug1 → 1 day in Aug → 900/3 = 300
  assert.equal(proratedRevenue(bookings[2], range), 300)
  assert.equal(metrics.revenue, 3000 + 300)
  // Unique days: Aug 1–10 (first) covers Aug 1 from cross-month
  assert.equal(metrics.rentalDays, 10)
}

console.log('[5] screenshot case: month-prorated 6600 → 4200')
{
  const range = resolveStatsPeriod('month', null, null, now)
  const booking = {
    pickupDate: '2026-08-25T20:23:00.000Z',
    returnDate: '2026-09-05T10:00:00.000Z',
    status: 'confirmed',
    price: 6600,
    priceBreakdown: { days: 11 },
  }
  assert.equal(proratedRevenue(booking, range), 4200)
  const metrics = computeVehiclePeriodMetrics({
    car: { status: 'available', isAvaliable: true },
    bookings: [booking],
    maintenance: [],
    range,
    now,
  })
  assert.equal(metrics.revenue, 4200)
  assert.equal(metrics.bookingValue, 6600)
  assert.equal(metrics.currentlyRented, false)
  assert.equal(metrics.upcomingRentals, 1)
  assert.equal(metrics.rentalDays, 7)
}

console.log('[6] ledger charges preferred; deposits never counted')
{
  const booking = {
    status: 'completed',
    price: 5000,
    financial: {
      source: 'ledger',
      chargesTotal: 4800,
      refundsTotal: 200,
      depositHeld: 3000,
      depositRequired: 3000,
    },
  }
  assert.equal(bookingRecognizedRevenue(booking), 4600)
  const legacy = { status: 'completed', price: 5000, financial: { source: '', chargesTotal: 0 } }
  assert.equal(bookingRecognizedRevenue(legacy), 5000)
}

console.log('[7] currently on rent vs future pickup')
{
  assert.equal(isBookingCurrentlyOnRent({
    pickupDate: '2026-08-20T10:00:00.000Z',
    returnDate: '2026-08-28T10:00:00.000Z',
    status: 'confirmed',
  }, now), true)
  assert.equal(isBookingCurrentlyOnRent({
    pickupDate: '2026-08-25T21:23:00.000Z',
    returnDate: '2026-08-30T10:00:00.000Z',
    status: 'ready_for_pickup',
  }, now), false)
}

console.log('[8] consecutive handoff does not double-count shared calendar day')
{
  const range = resolveStatsPeriod('custom', '2026-08-01', '2026-08-31', now)
  const bookings = [
    { pickupDate: '2026-08-01T08:00:00.000Z', returnDate: '2026-08-05T08:00:00.000Z', status: 'completed', price: 1000 },
    { pickupDate: '2026-08-05T12:00:00.000Z', returnDate: '2026-08-10T08:00:00.000Z', status: 'completed', price: 1500 },
  ]
  assert.equal(uniqueRentalDaysInRange(bookings, range), 9)
  assert.equal(bookingCalendarDays(bookings[0]), calcRentalDays(new Date(bookings[0].pickupDate), new Date(bookings[0].returnDate)))
}

console.log('[9] physical-vehicle isolation (two Clio 5s stay separate)')
{
  const range = resolveStatsPeriod('month', null, null, now)
  const a = computeVehiclePeriodMetrics({
    car: { _id: 'clio-a', fleetId: 'FLT-123', status: 'available', isAvaliable: true },
    bookings: [{ pickupDate: '2026-08-01T08:00:00.000Z', returnDate: '2026-08-04T08:00:00.000Z', status: 'completed', price: 900, priceBreakdown: { days: 3 } }],
    maintenance: [],
    range,
    now,
  })
  const b = computeVehiclePeriodMetrics({
    car: { _id: 'clio-b', fleetId: 'FLT-456', status: 'available', isAvaliable: true },
    bookings: [],
    maintenance: [],
    range,
    now,
  })
  assert.equal(a.revenue, 900)
  assert.equal(b.revenue, 0)
  assert.equal(b.totalRentals, 0)
}

console.log('[10] fleet KPI consistency + trend grain')
{
  assert.equal(suggestedTrendGrain(7), 'daily')
  assert.equal(suggestedTrendGrain(45), 'weekly')
  assert.equal(suggestedTrendGrain(200), 'monthly')
  const range = resolveStatsPeriod('month', null, null, now)
  const cars = [
    { _id: 'a', status: 'available', isAvaliable: true },
    { _id: 'b', status: 'available', isAvaliable: true },
    { _id: 'c', status: 'maintenance', isAvaliable: false },
  ]
  const byCar = {
    a: [{ pickupDate: '2026-08-01T08:00:00.000Z', returnDate: '2026-08-04T08:00:00.000Z', status: 'completed', price: 1200, priceBreakdown: { days: 3 } }],
    b: [
      { pickupDate: '2026-08-10T08:00:00.000Z', returnDate: '2026-08-12T08:00:00.000Z', status: 'cancelled', price: 999 },
      { pickupDate: '2026-08-15T08:00:00.000Z', returnDate: '2026-08-17T08:00:00.000Z', status: 'active', price: 800, priceBreakdown: { days: 2 } },
    ],
    c: [],
  }
  const rows = cars.map((car) =>
    computeVehiclePeriodMetrics({ car, bookings: byCar[car._id], maintenance: [], range, now }),
  )
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
  const revenueRentals = rows.reduce((s, r) => s + r.revenueRentals, 0)
  const rentalDays = rows.reduce((s, r) => s + r.rentalDays, 0)
  assert.equal(totalRevenue, 2000)
  assert.equal(revenueRentals, 2)
  assert.equal(rentalDays, 3 + 2)
  assert.equal(rows[1].currentlyRented, true)
  assert.equal(rows[2].availability, 'maintenance')
}

console.log('\n[vehicle-stats-period] OK\n')

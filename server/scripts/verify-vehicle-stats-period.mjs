/**
 * Period math + overlap semantics for vehicle / fleet statistics.
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
  inclusiveUtcDays,
} from '../services/vehicleStatsService.js'

const now = new Date('2026-08-25T19:23:00.000Z') // 21:23 UTC+2 — one hour before T-ROC pickup

console.log('[1] presets')
{
  const month = resolveStatsPeriod('month', null, null, now)
  assert.equal(toIsoDate(month.from), '2026-08-01')
  assert.equal(toIsoDate(month.to), '2026-08-31')
  assert.equal(month.periodDays, 31)

  const last = resolveStatsPeriod('last_month', null, null, now)
  assert.equal(toIsoDate(last.from), '2026-07-01')
  assert.equal(toIsoDate(last.to), '2026-07-31')

  const last3 = resolveStatsPeriod('last_3_months', null, null, now)
  assert.equal(toIsoDate(last3.from), '2026-06-01')
  assert.equal(toIsoDate(last3.to), '2026-08-31')

  const today = resolveStatsPeriod('today', null, null, now)
  assert.equal(toIsoDate(today.from), '2026-08-25')
  assert.equal(today.periodDays, 1)

  const custom = resolveStatsPeriod('custom', '2026-08-01', '2026-08-03', now)
  assert.equal(custom.periodDays, 3)
}

console.log('[2] bookings outside the range are excluded')
{
  const range = resolveStatsPeriod('custom', '2026-08-01', '2026-08-31', now)
  const inside = {
    pickupDate: '2026-08-10T10:00:00.000Z',
    returnDate: '2026-08-12T10:00:00.000Z',
    status: 'completed',
    price: 600,
    priceBreakdown: { days: 2 },
  }
  const outside = {
    pickupDate: '2026-07-01T10:00:00.000Z',
    returnDate: '2026-07-04T10:00:00.000Z',
    status: 'completed',
    price: 900,
    priceBreakdown: { days: 3 },
  }
  assert.equal(bookingOverlapsRange(inside, range), true)
  assert.equal(bookingOverlapsRange(outside, range), false)
}

console.log('[3] cancelled bookings do not add revenue; overlapping days are prorated')
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
      customerName: 'Amina',
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
  const metrics = computeVehiclePeriodMetrics({ car, bookings, maintenance: [], range, now })
  assert.equal(metrics.cancellations, 1)
  assert.equal(metrics.completedRentals, 2)
  assert.equal(metrics.totalRentals, 2)
  assert.equal(metrics.revenueRentals, 2)
  // Aug overlap of the Jul 30–Aug 2 booking is 2 days of 3 → 600
  assert.equal(metrics.revenue, 3000 + 600)
  assert.equal(metrics.bookingValue, 3000 + 900)
  // Unique days: Aug 1–11 (11) covers the cross-month Aug 1–2 overlap
  assert.equal(metrics.rentalDays, 11)
  assert.equal(metrics.utilization > 0, true)
  assert.equal(metrics.avgRentalRevenue, Math.round(((3000 + 600) / 2) * 100) / 100)
}

console.log('[4] idle vehicle ranks underperforming when others earned')
{
  const range = resolveStatsPeriod('month', null, null, now)
  const idle = computeVehiclePeriodMetrics({
    car: { status: 'available', isAvaliable: true },
    bookings: [],
    maintenance: [],
    range,
    now,
  })
  assert.equal(idle.revenue, 0)
  assert.equal(idle.totalRentals, 0)
  assert.equal(idle.currentlyRented, false)
  assert.equal(idle.availability, 'available')
}

console.log('[5] trend grain follows range length')
{
  assert.equal(suggestedTrendGrain(7), 'daily')
  assert.equal(suggestedTrendGrain(45), 'weekly')
  assert.equal(suggestedTrendGrain(200), 'monthly')
}

console.log('[6] dashboard screenshot case: month-prorated revenue vs full booking value')
{
  // T-ROC: pickup 25 Aug, return 5 Sep, 11 billed days, MAD 6600 → Aug share 7/11 = 4200
  const range = resolveStatsPeriod('month', null, null, now)
  const booking = {
    pickupDate: '2026-08-25T20:23:00.000Z',
    returnDate: '2026-09-05T10:00:00.000Z',
    status: 'confirmed',
    price: 6600,
    priceBreakdown: { days: 11 },
    customerName: 'SOULAIMANE BOUARAFA',
  }
  assert.equal(proratedRevenue(booking, range), 4200)
  const car = { _id: 'troc', status: 'available', isAvaliable: true, pricePerDay: 600 }
  const metrics = computeVehiclePeriodMetrics({
    car,
    bookings: [booking],
    maintenance: [],
    range,
    now,
  })
  assert.equal(metrics.revenue, 4200)
  assert.equal(metrics.bookingValue, 6600)
  assert.equal(metrics.revenueRentals, 1)
  assert.equal(metrics.avgRentalRevenue, 4200)
  assert.equal(metrics.totalRentals, 1)
  // Pickup is in the future relative to now → not yet on rent
  assert.equal(metrics.currentlyRented, false)
  assert.equal(metrics.availability, 'available')
  assert.equal(metrics.upcomingRentals, 1)
  assert.equal(metrics.rentalDays, 7)
  assert.equal(metrics.utilization, Math.round((7 / 31) * 1000) / 10)
}

console.log('[7] currently on rent: confirmed with pickup reached')
{
  const range = resolveStatsPeriod('month', null, null, now)
  const out = {
    pickupDate: '2026-08-20T10:00:00.000Z',
    returnDate: '2026-08-28T10:00:00.000Z',
    status: 'confirmed',
    price: 2400,
    priceBreakdown: { days: 8 },
  }
  assert.equal(isBookingCurrentlyOnRent(out, now), true)
  const metrics = computeVehiclePeriodMetrics({
    car: { status: 'available', isAvaliable: true },
    bookings: [out],
    maintenance: [],
    range,
    now,
  })
  assert.equal(metrics.currentlyRented, true)
  assert.equal(metrics.availability, 'rented')
  assert.equal(metrics.activeRentals, 1)
}

console.log('[8] future confirmed pickup is not on rent yet')
{
  const future = {
    pickupDate: '2026-08-25T21:23:00.000Z',
    returnDate: '2026-08-30T10:00:00.000Z',
    status: 'ready_for_pickup',
    price: 1500,
  }
  assert.equal(isBookingCurrentlyOnRent(future, now), false)
}

console.log('[9] consecutive bookings do not double-count shared day')
{
  const range = resolveStatsPeriod('custom', '2026-08-01', '2026-08-31', now)
  const bookings = [
    {
      pickupDate: '2026-08-01T08:00:00.000Z',
      returnDate: '2026-08-05T08:00:00.000Z',
      status: 'completed',
      price: 1000,
    },
    {
      pickupDate: '2026-08-05T12:00:00.000Z',
      returnDate: '2026-08-10T08:00:00.000Z',
      status: 'completed',
      price: 1500,
    },
  ]
  const days = uniqueRentalDaysInRange(bookings, range)
  assert.equal(days, 10)
  assert.equal(inclusiveUtcDays(range.from, range.to), 31)
  const metrics = computeVehiclePeriodMetrics({
    car: { status: 'available', isAvaliable: true },
    bookings,
    maintenance: [],
    range,
    now,
  })
  assert.equal(metrics.rentalDays, 10)
  assert.equal(metrics.revenue, 2500)
  assert.equal(metrics.totalRentals, 2)
}

console.log('[10] fleet KPI consistency: sum of vehicle revenues = fleet total')
{
  const range = resolveStatsPeriod('month', null, null, now)
  const cars = [
    { _id: 'a', status: 'available', isAvaliable: true },
    { _id: 'b', status: 'available', isAvaliable: true },
    { _id: 'c', status: 'maintenance', isAvaliable: false },
  ]
  const byCar = {
    a: [
      {
        pickupDate: '2026-08-01T08:00:00.000Z',
        returnDate: '2026-08-04T08:00:00.000Z',
        status: 'completed',
        price: 1200,
        priceBreakdown: { days: 3 },
      },
    ],
    b: [
      {
        pickupDate: '2026-08-10T08:00:00.000Z',
        returnDate: '2026-08-12T08:00:00.000Z',
        status: 'cancelled',
        price: 999,
      },
      {
        pickupDate: '2026-08-15T08:00:00.000Z',
        returnDate: '2026-08-17T08:00:00.000Z',
        status: 'active',
        price: 800,
        priceBreakdown: { days: 2 },
      },
    ],
    c: [],
  }
  const rows = cars.map((car) =>
    computeVehiclePeriodMetrics({
      car,
      bookings: byCar[car._id],
      maintenance: [],
      range,
      now,
    }),
  )
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
  const revenueRentals = rows.reduce((s, r) => s + r.revenueRentals, 0)
  const rentalDays = rows.reduce((s, r) => s + r.rentalDays, 0)
  assert.equal(totalRevenue, 1200 + 800)
  assert.equal(revenueRentals, 2)
  assert.equal(Math.round((totalRevenue / revenueRentals) * 100) / 100, 1000)
  // Calendar inclusive days (not billed days): Aug 1–4 = 4, Aug 15–17 = 3
  assert.equal(rentalDays, 4 + 3)
  assert.equal(rows[1].currentlyRented, true)
  assert.equal(rows[2].availability, 'maintenance')
  const fleetUtil = Math.round(((rentalDays / (cars.length * range.periodDays)) * 100) * 10) / 10
  assert.equal(fleetUtil, Math.round(((7 / (3 * 31)) * 100) * 10) / 10)
}

console.log('\n[vehicle-stats-period] OK\n')

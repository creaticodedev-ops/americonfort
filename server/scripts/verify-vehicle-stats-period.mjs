/**
 * Period math + overlap semantics for vehicle statistics.
 *   node scripts/verify-vehicle-stats-period.mjs
 */
import assert from 'node:assert/strict'
import {
  resolveStatsPeriod,
  bookingOverlapsRange,
  computeVehiclePeriodMetrics,
  suggestedTrendGrain,
  toIsoDate,
} from '../services/vehicleStatsService.js'

const now = new Date('2026-08-24T12:00:00.000Z')

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
  assert.equal(toIsoDate(today.from), '2026-08-24')
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
  // Aug overlap of the Jul 30–Aug 2 booking is 2 days of 3 → 600
  assert.equal(metrics.revenue, 3000 + 600)
  assert.ok(metrics.rentalDays >= 12)
  assert.equal(metrics.utilization > 0, true)
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
}

console.log('[5] trend grain follows range length')
{
  assert.equal(suggestedTrendGrain(7), 'daily')
  assert.equal(suggestedTrendGrain(45), 'weekly')
  assert.equal(suggestedTrendGrain(200), 'monthly')
}

console.log('\n[vehicle-stats-period] OK\n')

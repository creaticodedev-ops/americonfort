/**
 * Smoke test for analytics period helpers (no DB).
 *   node scripts/verify-analytics-revenue-helpers.mjs
 */
import assert from 'node:assert/strict'
import {
  previousEquivalentRange,
} from '../services/analyticsRevenueService.js'
import { resolveStatsPeriod, inclusiveUtcDays } from '../services/vehicleStatsService.js'

const now = new Date(Date.UTC(2026, 8, 13)) // 13 Sep 2026

const month = resolveStatsPeriod('month', null, null, now)
assert.equal(month.from.toISOString().slice(0, 10), '2026-09-01')
assert.equal(month.to.toISOString().slice(0, 10), '2026-09-30')

const prevMonth = previousEquivalentRange(month, 'month', now)
assert.equal(prevMonth.from.toISOString().slice(0, 10), '2026-08-01')
assert.equal(prevMonth.to.toISOString().slice(0, 10), '2026-08-31')

const year = resolveStatsPeriod('year', null, null, now)
const prevYear = previousEquivalentRange(year, 'year', now)
assert.equal(prevYear.from.toISOString().slice(0, 10), '2025-01-01')
assert.equal(prevYear.to.toISOString().slice(0, 10), '2025-12-31')

const week = resolveStatsPeriod('week', null, null, now)
assert.equal(week.from.getUTCDay(), 1) // Monday

const custom = resolveStatsPeriod('custom', '2026-09-01', '2026-09-10', now)
const prevCustom = previousEquivalentRange(custom, 'custom', now)
assert.equal(inclusiveUtcDays(custom.from, custom.to), inclusiveUtcDays(prevCustom.from, prevCustom.to))
assert.equal(prevCustom.to.toISOString().slice(0, 10), '2026-08-31')

console.log('[verify-analytics-revenue-helpers] OK')

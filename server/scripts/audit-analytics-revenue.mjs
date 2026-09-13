/**
 * One-off audit: compare Analytics createdAt/$price KPIs vs fleet recognized/prorated revenue.
 *   node scripts/audit-analytics-revenue.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import {
  bookingRecognizedRevenue,
  proratedRevenue,
  resolveStatsPeriod,
} from '../services/vehicleStatsService.js'

const statuses = ['confirmed', 'ready_for_pickup', 'active', 'completed']

await mongoose.connect(process.env.MONGODB_URI)
const bookings = await Booking.find({ status: { $in: statuses } })
  .select('owner price status channel createdAt pickupDate returnDate paymentStatus financial customerName')
  .lean()

console.log('revenue bookings', bookings.length)

const byOwner = new Map()
for (const b of bookings) {
  const k = String(b.owner)
  if (!byOwner.has(k)) byOwner.set(k, [])
  byOwner.get(k).push(b)
}
const owners = [...byOwner.entries()].sort((a, b) => b[1].length - a[1].length)
const [ownerId, list] = owners[0] || ['none', []]
console.log('top owner', ownerId, 'n=', list.length)

const now = new Date()
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const weekStartSun = new Date(now)
weekStartSun.setDate(now.getDate() - now.getDay())
weekStartSun.setHours(0, 0, 0, 0)
const weekStartMon = new Date(now)
const wd = (now.getDay() + 6) % 7
weekStartMon.setDate(now.getDate() - wd)
weekStartMon.setHours(0, 0, 0, 0)
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
const yearStart = new Date(now.getFullYear(), 0, 1)

const sumPrice = (arr) => arr.reduce((s, b) => s + (Number(b.price) || 0), 0)
const createdIn = (from) => list.filter((b) => new Date(b.createdAt) >= from)

console.log('--- createdAt price (current Analytics API) ---')
console.log('today', sumPrice(createdIn(todayStart)), 'count', createdIn(todayStart).length)
console.log('week Sun', sumPrice(createdIn(weekStartSun)), 'count', createdIn(weekStartSun).length)
console.log('week Mon', sumPrice(createdIn(weekStartMon)), 'count', createdIn(weekStartMon).length)
console.log('month', sumPrice(createdIn(monthStart)), 'count', createdIn(monthStart).length)
console.log('year', sumPrice(createdIn(yearStart)), 'count', createdIn(yearStart).length)
console.log('lifetime price', sumPrice(list))
console.log(
  'online',
  sumPrice(list.filter((b) => b.channel !== 'walk_in')),
  'walk_in',
  sumPrice(list.filter((b) => b.channel === 'walk_in')),
)

const year = now.getUTCFullYear()
const statsRange = resolveStatsPeriod('year', `${year}-01-01`, `${year}-12-31`, now)
const range = { start: statsRange.from, end: statsRange.to }
let prorated = 0
let recognized = 0
for (const b of list) {
  recognized += bookingRecognizedRevenue(b)
  prorated += proratedRevenue(b, range)
}
console.log('--- recognized vs prorated year', year, '---')
console.log('sum price', sumPrice(list))
console.log('sum recognized', Math.round(recognized * 100) / 100)
console.log('sum prorated year', Math.round(prorated * 100) / 100)

console.log('--- bookings detail ---')
for (const b of list) {
  console.log({
    ch: b.channel,
    st: b.status,
    price: b.price,
    rec: bookingRecognizedRevenue(b),
    pro: proratedRevenue(b, range),
    pay: b.paymentStatus,
    bal: b.financial?.balanceDue,
    charges: b.financial?.chargesTotal,
    created: String(b.createdAt).slice(0, 10),
    pickup: b.pickupDate ? String(b.pickupDate).slice(0, 10) : null,
    ret: b.returnDate ? String(b.returnDate).slice(0, 10) : null,
  })
}

await mongoose.disconnect()

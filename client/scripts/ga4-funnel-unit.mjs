/**
 * Runtime unit checks for GA4 helper dedupe + PII stripping (no network).
 * Uses Vite to resolve import.meta.env.
 *
 * Usage:
 *   VITE_GA4_MEASUREMENT_ID=G-ZLJ4Z0MFM0 npx vite-node scripts/ga4-funnel-unit.mjs
 * Fallback without vite-node: node --import ./scripts/ga4-funnel-unit-shim.mjs (not used)
 */
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

process.env.VITE_GA4_MEASUREMENT_ID = process.env.VITE_GA4_MEASUREMENT_ID || 'G-ZLJ4Z0MFM0'

const events = []
globalThis.window = {
  location: { pathname: '/', search: '', href: 'http://localhost/' },
  gtag: (...args) => {
    events.push(args)
  },
}
globalThis.document = { title: 'test' }

const server = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
})

try {
  const mod = await server.ssrLoadModule('/src/utils/ga.js')
  const {
    trackViewCar,
    trackBeginCheckout,
    trackBookingCompleted,
    trackBookingSuccess,
    trackEvent,
    __resetGaDedupeForTests,
  } = mod

  let failed = false
  const assert = (label, cond) => {
    console.log(`${cond ? 'OK' : 'FAIL'}: ${label}`)
    if (!cond) failed = true
  }

  __resetGaDedupeForTests()
  events.length = 0

  trackViewCar({ carId: 'car1', carCategory: 'SUV', value: 500, currency: 'MAD' })
  trackViewCar({ carId: 'car1', carCategory: 'SUV', value: 500, currency: 'MAD' })
  const viewCarCount = events.filter((e) => e[0] === 'event' && e[1] === 'view_car').length
  assert('view_car fires once per car_id', viewCarCount === 1)

  __resetGaDedupeForTests()
  events.length = 0
  trackBeginCheckout({ carId: 'car1', value: 500 })
  trackBeginCheckout({ carId: 'car1', value: 500 })
  const beginCount = events.filter((e) => e[0] === 'event' && e[1] === 'begin_checkout').length
  assert('begin_checkout fires once per car_id', beginCount === 1)

  __resetGaDedupeForTests()
  events.length = 0
  trackBookingCompleted({ bookingId: 'R1', value: 900, carId: 'car1' })
  trackBookingCompleted({ bookingId: 'R1', value: 900, carId: 'car1' })
  const completedCount = events.filter((e) => e[0] === 'event' && e[1] === 'booking_completed').length
  assert('booking_completed fires once per booking_id', completedCount === 1)

  __resetGaDedupeForTests()
  events.length = 0
  trackBookingSuccess({
    bookingId: 'R2',
    value: 800,
    currency: 'MAD',
    carId: 'car9',
    email: 'should-not-appear@example.com',
    phone: '+212600000000',
    fullName: 'Secret Name',
  })
  const payloads = events
    .filter((e) => e[0] === 'event' && (e[1] === 'booking_lead' || e[1] === 'booking_completed'))
    .map((e) => e[2] || {})
  assert('booking_lead + booking_completed both fire on success', payloads.length === 2)
  assert(
    'PII stripped from booking events',
    payloads.every((p) => !p.email && !p.phone && !p.fullName && p.booking_id === 'R2'),
  )

  events.length = 0
  trackEvent('probe', { email: 'x@y.z', car_id: 'c1', notes: 'secret' })
  const probe = events.find((e) => e[1] === 'probe')?.[2] || {}
  assert('generic trackEvent strips email/notes', !probe.email && !probe.notes && probe.car_id === 'c1')

  if (failed) {
    console.error('\nGA4 funnel unit checks failed')
    process.exit(1)
  }
  console.log('\nGA4 funnel unit checks passed')
} finally {
  await server.close()
}

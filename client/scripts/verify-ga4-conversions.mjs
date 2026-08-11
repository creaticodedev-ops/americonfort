/**
 * Verifies conversion funnel event names are present in the production bundle,
 * and that booking_completed is only wired behind backend success in CarDetails.
 *
 * Usage (after build with VITE_GA4_MEASUREMENT_ID set):
 *   node scripts/verify-ga4-conversions.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const distAssets = path.join(root, 'dist', 'assets')
const gaSrc = path.join(root, 'src', 'utils', 'ga.js')
const carDetailsSrc = path.join(root, 'src', 'pages', 'CarDetails.jsx')

const REQUIRED_EVENTS = [
  'view_car',
  'search_cars',
  'begin_checkout',
  'whatsapp_click',
  'phone_click',
  'contact_submit',
  'booking_lead',
  'booking_completed',
]

const PII_KEYS = [
  'email',
  'phone',
  'fullName',
  'customer_name',
  'cin',
  'passport',
  'signature',
  'address',
]

let failed = false
const ok = (label, pass) => {
  console.log(`${pass ? 'OK' : 'FAIL'}: ${label}`)
  if (!pass) failed = true
}

if (!fs.existsSync(gaSrc)) {
  console.error('FAIL: src/utils/ga.js missing')
  process.exit(1)
}

const gaText = fs.readFileSync(gaSrc, 'utf8')
for (const event of REQUIRED_EVENTS) {
  ok(`ga.js defines/fires "${event}"`, gaText.includes(`'${event}'`) || gaText.includes(`"${event}"`))
}
ok('ga.js strips PII keys', PII_KEYS.every((k) => gaText.includes(`'${k}'`) || gaText.includes(`"${k}"`)))
ok('ga.js dedupes booking_completed', gaText.includes('completedBookings'))
ok('ga.js dedupes view_car', gaText.includes('viewedCars'))

const carText = fs.readFileSync(carDetailsSrc, 'utf8')
ok('CarDetails calls trackBookingSuccess', carText.includes('trackBookingSuccess'))

const successBlock = carText.match(/if \(data\.success\) \{[\s\S]*?\n      \} else \{/)
ok(
  'CarDetails fires booking success only inside data.success block',
  Boolean(successBlock?.[0]?.includes('trackBookingSuccess')),
)
ok(
  'CarDetails does not call trackBookingSuccess before the create request',
  (() => {
    const postIdx = carText.indexOf("axios.post('/api/bookings/create'")
    const callIdx = carText.indexOf('trackBookingSuccess({')
    return postIdx !== -1 && callIdx !== -1 && callIdx > postIdx
  })(),
)
ok(
  'CarDetails fires begin_checkout on panel view (not only submit)',
  carText.includes('trackBeginCheckout') && carText.includes('Entering the reservation panel'),
)
ok(
  'booking success tracking uses bookingId without customer PII args',
  /trackBookingSuccess\(\{[\s\S]*?bookingId:[\s\S]*?\}\)/.test(carText)
  && !/trackBookingSuccess\(\{[\s\S]*?(email|phone|fullName|customerName):/.test(carText),
)

if (!fs.existsSync(distAssets)) {
  console.error('FAIL: dist/assets missing — run npm run build with VITE_GA4_MEASUREMENT_ID first')
  process.exit(1)
}

const jsFiles = fs.readdirSync(distAssets).filter((f) => f.endsWith('.js'))
const bundle = jsFiles.map((f) => fs.readFileSync(path.join(distAssets, f), 'utf8')).join('\n')

for (const event of REQUIRED_EVENTS) {
  ok(`dist bundle includes event "${event}"`, bundle.includes(event))
}

if (failed) {
  console.error('\nGA4 conversion verification failed')
  process.exit(1)
}
console.log('\nGA4 conversion verification passed')

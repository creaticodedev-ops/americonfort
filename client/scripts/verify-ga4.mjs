/**
 * Verifies GA4 is injected into the production build when VITE_GA4_MEASUREMENT_ID is set.
 * Usage: VITE_GA4_MEASUREMENT_ID=G-ZLJ4Z0MFM0 node scripts/verify-ga4.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distHtml = path.join(__dirname, '..', 'dist', 'index.html')
const expectedId = (process.env.VITE_GA4_MEASUREMENT_ID || 'G-ZLJ4Z0MFM0').trim()

if (!fs.existsSync(distHtml)) {
  console.error('FAIL: dist/index.html missing — run npm run build first')
  process.exit(1)
}

const html = fs.readFileSync(distHtml, 'utf8')
const checks = [
  ['gtag.js script', html.includes(`googletagmanager.com/gtag/js?id=${expectedId}`)],
  ['gtag config', html.includes(`gtag('config', '${expectedId}'`)],
  ['consent default', html.includes("gtag('consent', 'default'")],
  ['send_page_view false', html.includes('send_page_view: false')],
  ['analytics_storage granted', html.includes("analytics_storage: 'granted'")],
]

let failed = false
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'}: ${label}`)
  if (!ok) failed = true
}

const assetsDir = path.join(__dirname, '..', 'dist', 'assets')
const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
const hasIdInBundle = jsFiles.some((f) =>
  fs.readFileSync(path.join(assetsDir, f), 'utf8').includes(expectedId),
)
console.log(`${hasIdInBundle ? 'OK' : 'FAIL'}: measurement ID present in JS bundles`)
if (!hasIdInBundle) failed = true

if (failed) {
  console.error(`\nGA4 verification failed for ${expectedId}`)
  process.exit(1)
}
console.log(`\nGA4 verification passed for ${expectedId}`)

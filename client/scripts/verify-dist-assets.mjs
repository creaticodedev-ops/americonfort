import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const htmlPath = path.join(dist, 'index.html')
const vercelPath = path.join(root, 'vercel.json')

if (!fs.existsSync(htmlPath)) {
  console.error('dist/index.html missing — run npm run build first')
  process.exit(1)
}

const html = fs.readFileSync(htmlPath, 'utf8')
const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
if (!refs.length) {
  console.error('No /assets/ references found in dist/index.html')
  process.exit(1)
}

let missing = 0
for (const rel of refs) {
  const file = path.join(dist, rel.replace(/^\//, ''))
  const ok = fs.existsSync(file)
  console.log(`${ok ? 'OK' : 'MISSING'}  ${rel}`)
  if (!ok) missing++
}

const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'))
const spa = (vercel.rewrites || []).find((r) => r.destination === '/index.html')
if (!spa) {
  console.error('vercel.json is missing an SPA fallback rewrite to /index.html')
  process.exit(1)
}
if (!String(spa.source).includes('assets/')) {
  console.error('SPA rewrite must exclude /assets/ so missing JS is never served as text/html')
  process.exit(1)
}

const sampleAsset = '/assets/index-missing-hash.js'
const spaRe = new RegExp(`^${spa.source}$`)
const rewritten = spaRe.test(sampleAsset)
const rewrittenPage = spaRe.test('/owner/manage-bookings')
const rewrittenRootJs = spaRe.test('/legacy-bundle.js')
const rewrittenCars = spaRe.test('/cars')
const rewrittenContact = spaRe.test('/contact')
console.log(`SPA rewrite source: ${spa.source}`)
console.log(`Would rewrite ${sampleAsset}: ${rewritten ? 'YES (BAD)' : 'NO (GOOD)'}`)
console.log(`Would rewrite /legacy-bundle.js: ${rewrittenRootJs ? 'YES (BAD)' : 'NO (GOOD)'}`)
console.log(`Would rewrite /owner/manage-bookings: ${rewrittenPage ? 'YES (GOOD)' : 'NO (BAD)'}`)
console.log(`Would rewrite /cars: ${rewrittenCars ? 'YES (GOOD)' : 'NO (BAD)'}`)
console.log(`Would rewrite /contact: ${rewrittenContact ? 'YES (GOOD)' : 'NO (BAD)'}`)
if (rewritten || rewrittenRootJs || !rewrittenPage || !rewrittenCars || !rewrittenContact) {
  console.error('SPA rewrite pattern is incorrect')
  process.exit(1)
}

const globalHeaders = (vercel.headers || []).find((h) => h.source === '/(.*)')
const nosniff = globalHeaders?.headers?.some((h) => h.key === 'X-Content-Type-Options' && h.value === 'nosniff')
console.log(`${nosniff ? 'OK' : 'FAIL'}  X-Content-Type-Options: nosniff`)
if (!nosniff) process.exit(1)

const bootOk = html.includes('cloudflareinsights') && html.includes("url.indexOf('/assets/')")
console.log(`${bootOk ? 'OK' : 'FAIL'}  classic boot isolator in index.html`)
if (!bootOk) process.exit(1)

const cfAsync = html.includes('data-cfasync="false"') && /<script data-cfasync="false" type="module"/.test(html)
console.log(`${cfAsync ? 'OK' : 'FAIL'}  Vite module scripts marked data-cfasync="false"`)
if (!cfAsync) process.exit(1)

const insightsIsModule = /<script[^>]*type="module"[^>]*cloudflareinsights/i.test(html)
console.log(`${insightsIsModule ? 'FAIL' : 'OK'}  app HTML does not inject Insights as type=module`)
if (insightsIsModule) process.exit(1)

const gtagIsModule = /<script[^>]*type="module"[^>]*googletagmanager/i.test(html)
console.log(`${gtagIsModule ? 'FAIL' : 'OK'}  gtag is not a module script`)
if (gtagIsModule) process.exit(1)

if (missing) {
  console.error(`Missing ${missing} referenced asset(s)`)
  process.exit(1)
}

console.log('OK: dist HTML assets exist, SPA rewrite excludes static files, boot isolator present')
